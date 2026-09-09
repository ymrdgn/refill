-- =====================================================================
--  Refill — Faz B: Kurumlar (Aile / Business) ve paylaşım altyapısı
--  refill_claude/SHARING_PLAN.md §4, §6, §7 uygulaması.
--
--  Supabase SQL editöründe TEK SEFERDE çalıştır. Tekrar çalıştırmak
--  güvenlidir (idempotent).
--
--  DİKKAT: Bu betik `sheets` üzerindeki mevcut "sheets_owner" politikasını
--  kaldırıp yerine ayrık select/insert/update/delete politikaları koyar.
--  Sonundaki DOĞRULAMA bölümünü mutlaka çalıştır.
-- =====================================================================

-- ------------------------------------------------------------------
-- ENTITLEMENTS.plan: satın alınan paket. Aile planının KAYNAĞI budur:
-- RevenueCat webhook'u yalnızca bu tabloya yazar (is_pro, pro_until, plan);
-- ailenin aktifliği sahibinin bu satırından türetilir (org_plan_active).
-- ------------------------------------------------------------------
alter table public.entitlements
  add column if not exists plan text check (plan in ('individual','family'));

-- ------------------------------------------------------------------
-- ORGANIZATIONS: aile ya da işletme
--   kind = 'family'   → plan/plan_until KULLANILMAZ; aktiflik sahibinin
--                       entitlements satırından gelir (plan = 'family').
--   kind = 'business' → plan = 'business' + plan_until ("işletme kodu" akışı).
--   Plan aktif değilse kurum tek kişiliktir (koltuk = 1).
-- ------------------------------------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null check (kind in ('family','business')),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  plan       text not null default 'none' check (plan in ('none','family','business')),
  plan_until timestamptz,
  seat_limit int  not null default 5,
  logo_path  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations alter column seat_limit set default 5;
update public.organizations set seat_limit = 5 where kind = 'family' and seat_limit = 4;

-- ------------------------------------------------------------------
-- ORG_MEMBERS: koltuklar
-- ------------------------------------------------------------------
create table if not exists public.org_members (
  org_id    uuid not null references public.organizations (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists idx_org_members_user on public.org_members (user_id);

-- ------------------------------------------------------------------
-- ORG_INVITES: aileye katılma bağlantısı (koltuk daveti)
-- Faz C'deki share_links'ten AYRIDIR: bu üyelik verir, kağıt erişimi değil.
-- ------------------------------------------------------------------
create table if not exists public.org_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  token      text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz,
  max_uses   int,
  uses       int not null default 0,
  revoked    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invites_org on public.org_invites (org_id);

-- ------------------------------------------------------------------
-- SHARE_GRANTS: Faz C (QR) için erişim kaydı.
-- Şimdi BOŞ oluşturuluyor ki RLS politikaları tek seferde yazılsın;
-- Faz C yalnızca share_links + redeem_share_token ekleyecek.
-- ------------------------------------------------------------------
create table if not exists public.share_grants (
  user_id    uuid not null references auth.users (id) on delete cascade,
  sheet_id   uuid not null references public.sheets (id) on delete cascade,
  org_id     uuid not null references public.organizations (id) on delete cascade,
  token      text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, sheet_id)
);

-- ------------------------------------------------------------------
-- SHEETS: kağıt artık bir kuruma ait olabilir
-- ------------------------------------------------------------------
alter table public.sheets
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

create index if not exists idx_sheets_org on public.sheets (org_id);

-- =====================================================================
--  YARDIMCI FONKSİYONLAR
--  Hepsi SECURITY DEFINER: aksi hâlde org_members politikası kendi
--  tablosunu sorgulayıp sonsuz özyinelemeye girer.
-- =====================================================================

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m
                  where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m
                  where m.org_id = p_org and m.user_id = auth.uid()
                    and m.role in ('owner','admin'));
$$;

/** Kurumun planı şu an geçerli mi? Aile → sahibinin entitlement'ı; işletme → org.plan */
create or replace function public.org_plan_active(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organizations o
     where o.id = p_org
       and case o.kind
             when 'family' then exists (
               select 1 from public.entitlements e
                where e.user_id = o.owner_id
                  and e.is_pro and e.plan = 'family'
                  and (e.pro_until is null or e.pro_until > now()))
             else o.plan = 'business'
                  and (o.plan_until is null or o.plan_until > now())
           end);
$$;

/** PostgREST hesaplanmış alan: select('*, plan_active') ile istemciye iner. */
create or replace function public.plan_active(o public.organizations)
returns boolean language sql stable security definer set search_path = public as $$
  select public.org_plan_active(o.id);
$$;

create or replace function public.has_sheet_grant(p_sheet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.share_grants g
                  where g.sheet_id = p_sheet and g.user_id = auth.uid()
                    and (g.expires_at is null or g.expires_at > now()));
$$;

create or replace function public.can_read_sheet(p_sheet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sheets s
     where s.id = p_sheet
       and ( s.user_id = auth.uid()
          or (s.org_id is not null and public.is_org_member(s.org_id))
          or public.has_sheet_grant(s.id) ));
$$;

/** Kullanıcı sınırsız kağıt hakkına sahip mi? (kişisel Pro VEYA planlı kurum üyesi) */
create or replace function public.has_unlimited_sheets(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    coalesce((select is_pro and (pro_until is null or pro_until > now())
                from public.entitlements where user_id = p_user), false)
    or exists (
      select 1 from public.org_members m
       where m.user_id = p_user
         and public.org_plan_active(m.org_id)
    );
$$;

/** Storage nesne adından ({user_id}/{sheet_id}.jpg) sheet id'sini çıkarır. */
create or replace function public.sheet_id_from_path(p_name text)
returns uuid language plpgsql immutable as $$
declare s text;
begin
  s := split_part(split_part(p_name, '/', 2), '.', 1);
  if s ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return s::uuid;
  end if;
  return null;
end;
$$;

-- =====================================================================
--  KOTA: org kağıtları planlı kurumda kotadan muaf
-- =====================================================================
create or replace function public.consume_photo_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  if tg_op = 'INSERT' then
    if new.image_path is null then return new; end if;
  else
    if new.image_path is null or old.image_path is not null then return new; end if;
  end if;

  -- Planlı bir kuruma ait kağıt kotaya girmez ve sayaca yazılmaz.
  if new.org_id is not null and public.org_plan_active(new.org_id) then
    return new;
  end if;

  if not public.has_unlimited_sheets(new.user_id) then
    select count(*) into cnt
      from public.sheets
     where user_id = new.user_id
       and image_path is not null
       and org_id is null;
    if cnt >= 3 then
      raise exception 'photo_quota_exceeded';
    end if;
  end if;

  insert into public.entitlements (user_id, photo_sheets_used)
  values (new.user_id, 1)
  on conflict (user_id) do update
    set photo_sheets_used = public.entitlements.photo_sheets_used + 1,
        updated_at = now();

  return new;
end;
$$;

-- =====================================================================
--  KOLTUK LİMİTİ
--  Plan aktif değilse kurum tek kişiliktir (paylaşım ücretli özelliktir).
-- =====================================================================
create or replace function public.enforce_seat_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim int;
  cnt int;
begin
  select case when public.org_plan_active(o.id) then o.seat_limit else 1 end
    into lim
    from public.organizations o
   where o.id = new.org_id;

  select count(*) into cnt from public.org_members m where m.org_id = new.org_id;

  if cnt >= coalesce(lim, 1) then
    raise exception 'seat_limit_exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_seat_limit on public.org_members;
create trigger trg_seat_limit
  before insert on public.org_members
  for each row execute function public.enforce_seat_limit();

-- =====================================================================
--  RPC: kurum oluştur (organizations + kurucu üyelik tek işlemde)
--  Aile için IDEMPOTENT: kullanıcının zaten sahibi olduğu bir aile varsa
--  onun id'si döner. İstemci satın alma sonrası bunu güvenle çağırır.
-- =====================================================================
create or replace function public.create_organization(p_name text, p_kind text default 'family')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('family','business') then raise exception 'invalid_kind'; end if;

  if p_kind = 'family' then
    select id into new_id from public.organizations
     where owner_id = auth.uid() and kind = 'family'
     limit 1;
    if new_id is not null then return new_id; end if;
  end if;

  insert into public.organizations (name, kind, owner_id, seat_limit)
  values (coalesce(nullif(trim(p_name), ''), 'Ailem'), p_kind, auth.uid(),
          case when p_kind = 'family' then 5 else 50 end)
  returning id into new_id;

  -- Kurucu her zaman içeri girer (koltuk limiti trigger'ı 0 < 1 olduğu için geçer).
  insert into public.org_members (org_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

-- =====================================================================
--  RPC: davet bağlantısıyla katıl
-- =====================================================================
create or replace function public.redeem_org_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.org_invites;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into inv from public.org_invites
   where token = p_token and not revoked
     and (expires_at is null or expires_at > now())
     and (max_uses is null or uses < max_uses);
  if not found then raise exception 'invalid_invite'; end if;

  -- Zaten üyeyse sessizce geç.
  if exists (select 1 from public.org_members m
              where m.org_id = inv.org_id and m.user_id = auth.uid()) then
    return inv.org_id;
  end if;

  -- Koltuk limiti trigger'ı burada devreye girer (plan yoksa limit 1'dir).
  insert into public.org_members (org_id, user_id, role)
  values (inv.org_id, auth.uid(), 'member');

  update public.org_invites set uses = uses + 1 where id = inv.id;
  return inv.org_id;
end;
$$;

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.organizations enable row level security;
alter table public.org_members   enable row level security;
alter table public.org_invites   enable row level security;
alter table public.share_grants  enable row level security;

-- ORGANIZATIONS
drop policy if exists "orgs_select" on public.organizations;
create policy "orgs_select" on public.organizations for select
  using (public.is_org_member(id));

drop policy if exists "orgs_update" on public.organizations;
create policy "orgs_update" on public.organizations for update
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));

drop policy if exists "orgs_delete" on public.organizations;
create policy "orgs_delete" on public.organizations for delete
  using (owner_id = auth.uid());
-- INSERT yok: kurum yalnızca create_organization() RPC'siyle açılır.

-- ORG_MEMBERS
drop policy if exists "members_select" on public.org_members;
create policy "members_select" on public.org_members for select
  using (public.is_org_member(org_id));

drop policy if exists "members_delete" on public.org_members;
create policy "members_delete" on public.org_members for delete
  using (user_id = auth.uid() or public.is_org_admin(org_id));
-- INSERT yok: üyelik create_organization() / redeem_org_invite() ile verilir.

-- ORG_INVITES: yalnızca yöneticiler görür ve üretir; katılım RPC ile olur.
drop policy if exists "invites_select" on public.org_invites;
create policy "invites_select" on public.org_invites for select
  using (public.is_org_admin(org_id));

drop policy if exists "invites_insert" on public.org_invites;
create policy "invites_insert" on public.org_invites for insert
  with check (public.is_org_admin(org_id) and created_by = auth.uid());

drop policy if exists "invites_update" on public.org_invites;
create policy "invites_update" on public.org_invites for update
  using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- SHARE_GRANTS: kullanıcı yalnızca kendi grant'lerini görür (Faz C'de dolacak).
drop policy if exists "grants_select" on public.share_grants;
create policy "grants_select" on public.share_grants for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- SHEETS: tek sahip politikası ayrıştırılıyor
-- ---------------------------------------------------------------
drop policy if exists "sheets_owner" on public.sheets;

drop policy if exists "sheets_select" on public.sheets;
create policy "sheets_select" on public.sheets for select
  using (user_id = auth.uid()
         or (org_id is not null and public.is_org_member(org_id))
         or public.has_sheet_grant(id));

drop policy if exists "sheets_insert" on public.sheets;
create policy "sheets_insert" on public.sheets for insert
  with check (user_id = auth.uid()
              and (org_id is null or public.is_org_member(org_id)));

drop policy if exists "sheets_update" on public.sheets;
create policy "sheets_update" on public.sheets for update
  using      (user_id = auth.uid() or (org_id is not null and public.is_org_admin(org_id)))
  with check (user_id = auth.uid() or (org_id is not null and public.is_org_admin(org_id)));

drop policy if exists "sheets_delete" on public.sheets;
create policy "sheets_delete" on public.sheets for delete
  using (user_id = auth.uid() or (org_id is not null and public.is_org_admin(org_id)));

-- ---------------------------------------------------------------
-- SHEET_ROWS: okuma kağıdı görebilene, yazma sahibine/yöneticisine
-- ---------------------------------------------------------------
drop policy if exists "rows_owner" on public.sheet_rows;

drop policy if exists "rows_select" on public.sheet_rows;
create policy "rows_select" on public.sheet_rows for select
  using (public.can_read_sheet(sheet_id));

drop policy if exists "rows_write" on public.sheet_rows;
create policy "rows_write" on public.sheet_rows for all
  using (exists (select 1 from public.sheets s
                  where s.id = sheet_id
                    and (s.user_id = auth.uid()
                         or (s.org_id is not null and public.is_org_admin(s.org_id)))))
  with check (exists (select 1 from public.sheets s
                  where s.id = sheet_id
                    and (s.user_id = auth.uid()
                         or (s.org_id is not null and public.is_org_admin(s.org_id)))));

-- ---------------------------------------------------------------
-- SESSIONS: oyun her zaman oynayana ait; yalnızca görebildiği kağıda açılır
-- ---------------------------------------------------------------
drop policy if exists "sessions_owner" on public.sessions;

drop policy if exists "sessions_select" on public.sessions;
create policy "sessions_select" on public.sessions for select
  using (user_id = auth.uid());

drop policy if exists "sessions_insert" on public.sessions;
create policy "sessions_insert" on public.sessions for insert
  with check (user_id = auth.uid() and public.can_read_sheet(sheet_id));

drop policy if exists "sessions_update" on public.sessions;
create policy "sessions_update" on public.sessions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sessions_delete" on public.sessions;
create policy "sessions_delete" on public.sessions for delete
  using (user_id = auth.uid());

-- session_rows ve strokes politikaları değişmiyor (parent session sahibine bağlı).

-- ---------------------------------------------------------------
-- STORAGE: okuma artık klasöre değil kağıt erişimine bağlı
-- Yazma/silme sahibinin kendi klasörüyle sınırlı kalır.
-- ---------------------------------------------------------------
drop policy if exists "sheets_storage_read" on storage.objects;
create policy "sheets_storage_read" on storage.objects
  for select using (
    bucket_id = 'sheets'
    and public.can_read_sheet(public.sheet_id_from_path(name))
  );

-- =====================================================================
--  DOĞRULAMA — betikten sonra çalıştır, hepsi true dönmeli
-- =====================================================================
-- select
--   (select count(*) from pg_policies
--     where tablename = 'sheets' and policyname like 'sheets_%') = 4          as sheets_policies_ok,
--   (select count(*) from pg_policies where tablename = 'org_members') = 2    as members_policies_ok,
--   to_regclass('public.organizations') is not null                           as orgs_table_ok,
--   (select column_name is not null from information_schema.columns
--     where table_name = 'sheets' and column_name = 'org_id')                 as sheets_org_id_ok,
--   (select column_name is not null from information_schema.columns
--     where table_name = 'entitlements' and column_name = 'plan')             as entitlements_plan_ok,
--   to_regprocedure('public.plan_active(public.organizations)') is not null   as plan_active_fn_ok;
--
-- Ödeme bağlanmadan aile akışını denemek için (kendi user id'nle):
-- update public.entitlements set is_pro = true, plan = 'family', pro_until = null
--  where user_id = '<uuid>';
-- (satır yoksa: insert into public.entitlements (user_id, is_pro, plan) values ('<uuid>', true, 'family');)
