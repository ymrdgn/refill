-- =====================================================================
--  Refill — Board Game Scores — Supabase şeması (Postgres + RLS)
--  Supabase SQL editöründe çalıştır. Tüm tablolarda RLS açık,
--  her satır auth.uid() ile sahibine kilitli.
-- =====================================================================

-- Gerekli uzantı (gen_random_uuid)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- SHEETS (kağıt / layout): bir fotoğraf + üstündeki satırlar
-- ------------------------------------------------------------------
create table if not exists public.sheets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'İsimsiz kağıt',
  image_path  text,                       -- Storage: {user_id}/{sheet_id}.jpg
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- SHEET_ROWS: kağıttaki puan satırları (y oranı + opsiyonel etiket)
-- ------------------------------------------------------------------
create table if not exists public.sheet_rows (
  id        uuid primary key default gen_random_uuid(),
  sheet_id  uuid not null references public.sheets (id) on delete cascade,
  idx       int  not null default 0,      -- sıralama
  y         real not null,                -- 0..1 oran
  label     text not null default ''
);

-- ------------------------------------------------------------------
-- SESSIONS (oyun): bir kağıdın tek oynanışı
-- ------------------------------------------------------------------
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  sheet_id   uuid not null references public.sheets (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'Oyun',
  played_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- SESSION_ROWS: her satırın tanınan/onaylanan değeri (string)
-- ------------------------------------------------------------------
create table if not exists public.session_rows (
  session_id uuid not null references public.sessions (id) on delete cascade,
  row_id     uuid not null references public.sheet_rows (id) on delete cascade,
  value      text not null default '',
  primary key (session_id, row_id)
);

-- ------------------------------------------------------------------
-- STROKES: kalem izleri (oran tabanlı vektör), opsiyonel satıra bağlı
-- points: jsonb  ->  [{ "x":0.80, "y":0.18, "t":1719... }, ...]
-- ------------------------------------------------------------------
create table if not exists public.strokes (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  row_id     uuid references public.sheet_rows (id) on delete set null,
  points     jsonb not null
);

-- İndeksler
create index if not exists idx_sheets_user      on public.sheets (user_id);
create index if not exists idx_rows_sheet        on public.sheet_rows (sheet_id);
create index if not exists idx_sessions_sheet    on public.sessions (sheet_id);
create index if not exists idx_sessions_user     on public.sessions (user_id);
create index if not exists idx_session_rows_sess on public.session_rows (session_id);
create index if not exists idx_strokes_session   on public.strokes (session_id);

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.sheets       enable row level security;
alter table public.sheet_rows   enable row level security;
alter table public.sessions     enable row level security;
alter table public.session_rows enable row level security;
alter table public.strokes      enable row level security;

-- SHEETS: doğrudan user_id
create policy "sheets_owner" on public.sheets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- SHEET_ROWS: parent sheet'in sahibi
create policy "rows_owner" on public.sheet_rows
  for all using (exists (
    select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.sheets s where s.id = sheet_id and s.user_id = auth.uid()
  ));

-- SESSIONS: doğrudan user_id
create policy "sessions_owner" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- SESSION_ROWS: parent session'ın sahibi
create policy "session_rows_owner" on public.session_rows
  for all using (exists (
    select 1 from public.sessions se where se.id = session_id and se.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.sessions se where se.id = session_id and se.user_id = auth.uid()
  ));

-- STROKES: parent session'ın sahibi
create policy "strokes_owner" on public.strokes
  for all using (exists (
    select 1 from public.sessions se where se.id = session_id and se.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.sessions se where se.id = session_id and se.user_id = auth.uid()
  ));

-- =====================================================================
--  STORAGE (private bucket: sheets)
--  Önce Dashboard veya şu çağrı ile bucket'ı oluştur:
--    insert into storage.buckets (id, name, public) values ('sheets','sheets', false);
--  Dosya yolu düzeni: {user_id}/{sheet_id}.jpg
--  Aşağıdaki politikalar kullanıcıyı kendi klasörüyle sınırlar.
-- =====================================================================
create policy "sheets_storage_read" on storage.objects
  for select using (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "sheets_storage_write" on storage.objects
  for insert with check (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "sheets_storage_update" on storage.objects
  for update using (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "sheets_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );
