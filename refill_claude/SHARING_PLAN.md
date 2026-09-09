# SHARING_PLAN.md — Paylaşım, kurumsal hesaplar ve QR

Bu doküman Refill'e **paylaşım** ve **çok kullanıcılı paketler** (Bireysel / Aile / Business) eklemenin ürün ve teknik tasarımıdır. `PROJECT_BRIEF.md` çekirdek ürünü, `BUILD_PLAN.md` MVP yol haritasını anlatır; bu doküman onların üzerine gelir ve **MVP bittikten sonra** uygulanır.

---

## 0. Önce karar verilmesi gereken şey (guardrail çakışması)

`CLAUDE.md` değişmez kural #1 şöyle diyor:

> Tüm kağıt görselleri kullanıcıdan gelir ve **özeldir** (private). Örnek/şablon kütüphanesi, **kullanıcılar arası görsel paylaşımı eklenmez** (telif riskini geri getirir).

Bu dokümandaki QR özelliği **tam olarak bunu yapar**: kafenin çektiği skor kağıdı fotoğrafı, yüzlerce müşterinin cihazına gider. Ürünün bugünkü hukuki güvenlik argümanı "kişisel kopya, özel kalır" idi; paylaşım bunu **dağıtıma** dönüştürür.

Bu bir "hayır" değil, bilinçli verilmesi gereken bir karardır. Devam edilecekse:

- `CLAUDE.md` kural #1 **güncellenmeli** (yoksa doküman ile kod birbiriyle çelişir).
- §9'daki risk azaltıcı önlemler **opsiyonel değil, tasarımın parçasıdır**.

Karar verilmeden Faz C'ye (QR) başlanmamalı. Faz A ve B (Storage + Aile) bu riski taşımaz, bağımsız olarak değerlidir.

---

## 0.1 Verilen karar — Aile paketi (2026-09-09)

**Aile = Duolingo tipi koltuk paketi.** Satın alan kişi 5 koltuğun sahibidir, üyeleri davet eder; her üye **sınırsız fotoğraf kağıdı** hakkı kazanır. Kağıtlar aile içinde **paylaşılmaz** — bir oyun için tek kişinin skor tutması yeter (§13 soru 5 böylece kapandı). `sheets.org_id` / `can_read_sheet` altyapısı kodda duruyor ama **yalnızca Business/QR (Faz C) için**; aile ekranında kağıt paylaşma arayüzü yoktur ve eklenmeyecektir.

Bunun teknik sonuçları:

- **Planın kaynağı sahibinin `entitlements` satırıdır** (`is_pro` + `plan = 'family'` + `pro_until`). RevenueCat webhook'u yalnızca bu tabloya yazar. `organizations.plan/plan_until` **aile için kullanılmaz**, yalnızca Business'ta anlamlıdır. `org_plan_active()` bu ayrımı yapar; istemciye `plan_active` hesaplanmış alanı olarak iner (`select('*, plan_active')`).
- **"Aile oluştur" adımı yok.** Aile kaydı, aile planı olan kullanıcı aile ekranını açtığında kendiliğinden oluşur (`create_organization` aile için idempotent). Satın alma → aile ekranı → doğrudan "davet et".
- **Davet linki `https`** (`EXPO_PUBLIC_LINK_BASE` + `web/index.html` yönlendirme sayfası, yol `/org/join/<token>`). Giriş yapmamış kişi tıklarsa token saklanır, girişten sonra katılma ekranına dönülür.

---

## 1. Ayırt edilmesi gereken iki paylaşım tipi

Tasarımın tamamı bu ayrıma dayanır:

| | **Koltuk (seat)** | **QR erişimi (grant)** |
|---|---|---|
| Kim | Aile üyesi, kalıcı | Kafe müşterisi, geçici |
| Nasıl | Davetle katılır, üye olur | QR tarar, hesap oluşturmaz |
| Sayı | Sınırlı (5, sahip dahil) ve sayılır | Sınırsız, sayılmaz |
| Kağıtta yetki | Kağıt paylaşımı **yok**; herkes sınırsız kağıt hakkı alır | **Salt-okunur** kağıt, kendi oyununu açar |
| Modeli | `org_members` | `share_grants` |

**En sık yapılacak hata:** kafe müşterilerini koltuk olarak saymak. O zaman kafeye "kaç müşterin gelecek" diye sormuş olursunuz; hem satılamaz hem de anlamsızdır. Business paketi **sınırsız müşteri / N oyun** üzerinden kurgulanır.

---

## 2. Paketler

| | Ücretsiz | Bireysel | Aile | Business |
|---|---|---|---|---|
| Kendi fotoğraflı kağıdı | 3 | Sınırsız | Sınırsız | Sınırsız |
| Boş (fotoğrafsız) kağıt | Sınırsız | Sınırsız | Sınırsız | Sınırsız |
| Kağıttan yeni oyun açma | Sınırsız | Sınırsız | Sınırsız | Sınırsız |
| Paylaşım | — | — | 5 koltuk (herkese sınırsız kağıt; kağıt paylaşımı yok) | QR, sınırsız müşteri |
| QR üretme | — | — | — | ✅ |
| Kafe paneli (istatistik) | — | — | — | ✅ |
| Satın alma kanalı | — | IAP | IAP | Fatura / Stripe |

**Bugünkü durumla uyum:** mevcut kodda yeni oyun açmak zaten ücretsiz ve sınırsız; kota yalnızca *fotoğraflı kağıt sayısında* (`lib/entitlements.ts`, `FREE_PHOTO_SHEETS = 3` + `sheets` üzerindeki `consume_photo_quota` trigger'ı). Bu model korunuyor. QR akışının değeri de tam olarak buradan geliyor: müşteri kağıdı **fotoğraflamak zorunda kalmıyor**, dolayısıyla kendi 3 hakkını harcamıyor — çünkü kağıt kafeye ait.

### Business'ı satılabilir yapan şey

QR tek başına zayıf bir satış argümanıdır. Kafeye satılan şey:

1. **Skor bloğu maliyetinin sıfırlanması** — tek somut, para cinsinden argüman. Fiyat çıpası buradan kurulur: kafenin aylık kağıt/fotokopi gideri.
2. **Panel:** hangi oyun kaç kez oynandı, hangi saatlerde, ortalama oyuncu sayısı. Kafe bunu envanter kararında kullanır ("bu oyun hiç oynanmıyor, rafı boşalt"). Business bedelinin asıl karşılığı budur.
3. **Marka:** kağıt ekranında kafenin logosu.

**Fiyatlama metriği:** koltuk değil, **sabit yıllık ücret + oyun sayısı bandı** (ör. 25 oyuna kadar). Basit, tahmin edilebilir, satması kolay.

**Stratejik not:** Business'ın asıl getirisi abonelik geliri değil, **kullanıcı kazanım kanalı** olmasıdır. Kafe size para öderken bir yandan da her masada yeni kullanıcı üretir (bkz. §5, adım 6).

---

## 3. Ön koşul: Storage yüklemesi (bu olmadan hiçbiri çalışmaz)

Bugün `sheets.image_path` alanına **ImagePicker'ın yerel dosya yolu** yazılıyor; Supabase Storage'a hiç yükleme yapılmıyor. Yani kağıdın fotoğrafı yalnızca sahibinin cihazında. QR'ı tarayan müşterinin ekranında kırık görsel çıkar.

`supabase/schema.sql` içindeki storage politikaları zaten hazır ama kod kullanmıyor. Yapılacaklar:

- Kağıt kaydedilirken görseli private `sheets` bucket'ına yükle, `image_path` alanına **Storage yolunu** yaz (yerel URI'yi değil).
- Görsel gösterirken `createSignedUrl` ile imzalı URL al (ör. 60 dk), `expo-file-system` ile yerelde önbellekle — offline-first bozulmasın.
- Yerel dosyayı da sakla ki çevrimdışıyken kendi kağıdın görünsün.

**Dosya düzeni — uygulanan karar:** `{user_id}/{sheet_id}.jpg` **korundu** (bu doküman önce düz `{sheet_id}.jpg` öneriyordu). Gerekçe: mevcut storage politikaları klasör tabanlı (`foldername(name)[1] = auth.uid()`) ve bu hâliyle **yazma izni hiçbir şeye bağımlı değil**. Düz isme geçmek, yükleme izninin `sheets` satırının sunucuda var olmasına bağlanmasını gerektirirdi — offline-first'te satır henüz push edilmemiş olabileceği için yükleme reddedilirdi.

Paylaşım bunu engellemiyor: Faz C'de **okuma** politikası klasör adına değil, yoldan ayrıştırılan sheet id'ye bakacak:

```sql
-- Faz C'de sheets_storage_read politikası şununla değişir:
public.can_read_sheet(split_part(split_part(name, '/', 2), '.', 1)::uuid)
```

Yani sahibinin uid'si yolda kalır ama erişim kararını `can_read_sheet()` verir. `supabase/schema.sql` değişmeden çalışır.

> Bu faz tek başına da değerlidir: kağıtlar nihayet cihazlar arası senkronlanır ve çıkış/giriş sonrası görseller kaybolmaz.

**Faz A'da ayrıca yapıldı — eski kayıtların kurtarılması.** Storage öncesinde `image_path` alanına ImagePicker'ın **önbellek** yolu yazılıyordu (`.../cache/ImagePicker/...`); Android bu dizini istediği zaman temizler ve fotoğraf sunucuda olmadığı için kalıcı olarak kaybolurdu. `migrateLegacyImages()` her senkronda bu satırları tarar, dosya duruyorsa kalıcı dizine alır ve yükler; dosya çoktan silinmişse satırı görselsiz bırakır.

---

## 4. Veri modeli

```sql
-- ------------------------------------------------------------------
-- ORGANIZATIONS: aile veya işletme
-- ------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null check (kind in ('family','business')),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  plan       text not null default 'none' check (plan in ('none','family','business')),  -- yalnızca business; aile → sahibin entitlements.plan
  plan_until timestamptz,
  seat_limit int  not null default 5,
  logo_path  text,                       -- business: kağıt ekranındaki marka
  created_at timestamptz not null default now()
);

-- entitlements.plan: satın alınan paket ('individual' | 'family'); aile planının kaynağı
alter table public.entitlements add column plan text check (plan in ('individual','family'));

-- ------------------------------------------------------------------
-- ORG_MEMBERS: koltuklar
-- ------------------------------------------------------------------
create table public.org_members (
  org_id    uuid not null references public.organizations (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ------------------------------------------------------------------
-- SHEETS: kağıt artık bir kuruma ait olabilir
-- ------------------------------------------------------------------
alter table public.sheets
  add column org_id uuid references public.organizations (id) on delete cascade;
create index idx_sheets_org on public.sheets (org_id);

-- ------------------------------------------------------------------
-- ORG_INVITES: aileye katılma bağlantısı (Faz B'de eklendi)
-- share_links'ten AYRIDIR: bu ÜYELİK verir, kağıt erişimi değil.
-- ------------------------------------------------------------------
create table public.org_invites (
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

-- ------------------------------------------------------------------
-- SHARE_LINKS: QR'ın arkasındaki token (tek kağıt ya da tüm katalog)
-- ------------------------------------------------------------------
create table public.share_links (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,        -- kısa, URL-safe (ör. 10 karakter)
  org_id     uuid not null references public.organizations (id) on delete cascade,
  sheet_id   uuid references public.sheets (id) on delete cascade,  -- null => katalog
  kind       text not null check (kind in ('sheet','catalog')),
  expires_at timestamptz,
  max_uses   int,
  uses       int not null default 0,
  revoked    boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- SHARE_GRANTS: token kullanılınca doğan kalıcı erişim kaydı
-- (RLS bunu okur; token'ı her istekte taşımak zorunda kalmayız)
-- ------------------------------------------------------------------
create table public.share_grants (
  user_id    uuid not null references auth.users (id) on delete cascade,
  sheet_id   uuid not null references public.sheets (id) on delete cascade,
  org_id     uuid not null references public.organizations (id) on delete cascade,
  token      text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, sheet_id)
);

-- Hangi oyun hangi QR'dan açıldı (panel istatistiği + kötüye kullanım takibi)
alter table public.sessions add column via_token text;
```

---

## 5. QR akışı — müşteri tarayınca ne oluyor

1. Kafe her oyunu için QR üretir (`share_links`, `kind='sheet'`) ve kutunun üstüne yapıştırır. Ek olarak masaya **katalog QR'ı** (`kind='catalog'`) koyabilir: tarayınca kafenin tüm oyunları listelenir, müşteri hangisini oynuyorsa seçer.
2. Müşteri telefon kamerasıyla tarar → `https://<alan-adı>/s/<token>` açılır.
3. Uygulama kuruluysa **universal/app link** ile doğrudan uygulamaya atlar. Değilse açılış sayfası mağaza linklerini gösterir.
4. Uygulamada hesap **sorulmaz**: Supabase **anonim giriş** ile sessizce oturum açılır. Kafede kayıt formu göstermek dönüşümü öldürür.
5. `redeem_share_token(token)` çağrılır → `share_grants` satırı oluşur → kağıt müşterinin listesinde **"Kafeden" rozetiyle salt-okunur** olarak görünür. Müşteri o kağıttan yeni oyun açar, yazar, kaydeder. Kağıdın satırlarını değiştiremez, silemez.
6. Oyun kaydedilince asıl kanca: *"Bu skoru saklamak ister misin? Hesabını oluştur."* → anonim hesap kalıcı hesaba yükseltilir (Supabase anonim → e-posta/Google bağlama destekler).

**Kurulumdan sonra ne oluyor?** Uygulama yeni kurulduysa token bilgisi kaybolur (deferred deep link altyapısı kurmak gereksiz karmaşıklık). Çözüm basit ve dürüst: açılış sayfası "Kurduktan sonra QR'ı tekrar okut" der. Bir adım fazla, sıfır altyapı.

### 5.1 QR neyi göstermeli? (alan adı gerçekten şart mı?)

QR'ın işi, uygulamanın kurulu olup olmamasına göre **farklı davranmak**. Bu yüzden seçenekler eşit değil:

| QR şunu gösterirse | Kurulu kullanıcı | Kurulu olmayan | Sonuç |
|---|---|---|---|
| **Mağaza linki** (App Store / Play) | Mağazaya düşer, uygulamaya değil | Kurar, ama **token kaybolur**; tekrar okutunca yine mağazaya gider → **döngü** | ❌ kullanılamaz |
| **`refill://s/<token>`** | Anında açılır | Kamera "geçersiz adres" der | ❌ tek başına yetmez |
| **`https://.../s/<token>`** | Sayfa uygulamayı açar | Sayfa mağazaya yönlendirir, token'ı mesajla korur | ✅ |

**Mağaza linki neden çalışmaz:** mağaza URL'i her koşulda aynı şeyi yapar ve "hangi kafe, hangi oyun" bilgisini taşıyamaz. Kuran müşteri boş ana ekranda kalır; QR'ı tekrar okuttuğunda yine mağazaya gider ve kafenin kağıdına hiçbir zaman ulaşamaz. Ayrıca tek bir mağaza URL'i iPhone ile Android'i birlikte çözemez.

**Gerçekten zorunlu olan tek şey bir `https` sayfası.** Sayfa: token'ı okur → `refill://s/<token>` ile uygulamayı açmayı dener → açılmazsa platforma göre mağaza butonlarını ve "kurduktan sonra QR'ı tekrar okut" mesajını gösterir. Bu sayfa satın alınmış bir alan adında olmak **zorunda değil**:

- **Supabase Edge Function** — ek altyapı sıfır: `https://<project-ref>.supabase.co/functions/v1/s?t=<token>`
- veya ücretsiz alt alan adı: `*.vercel.app`, `*.netlify.app`, GitHub Pages.

**Universal / App Link opsiyonel cilalamadır.** `apple-app-site-association` (iOS) + `assetlinks.json` (Android) tarayıcı parlamasını ve fazladan bir dokunuşu kaldırır, uygulamayı doğrudan açar. v1 için şart değil; gerektiğinde `*.vercel.app` gibi bir alt alan adında da çalışır.

**Yine de kendi alan adınızı almanız önerilir — sebebi teknik değil:** basılı QR geri alınamaz. Kafenin kutularına yapıştırdığı etiketler yıllarca orada kalır; QR'ın URL'i değişirse **basılmış tüm QR'lar ölür**. Supabase Edge Function URL'i proje referansına bağlıdır (proje taşınır/yeniden kurulursa biter), ücretsiz alt alan adları da platforma bağımlıdır. İşletmelere satış yaparken alan adı zaten gerekecek (kurumsal e-posta, tanıtım sayfası, fatura). QR'ları ilk günden kendi alan adınıza bastırmak en ucuz sigortadır.

**Üçüncü yol (ikincil):** müşteri QR'ı **uygulamanın içinden** tarar (`expo-camera` ile uygulama içi tarayıcı) — hiçbir web sayfası gerekmez. Ama yalnızca uygulaması kurulu olanlar için çalışır; kafedeki müşterilerin çoğu ilk kez karşılaşacağı için bunu tek yol yapmayın, mevcut kullanıcılar için kısayol olarak tutun.

---

## 6. Kota ve "pro" mantığının değişimi

Bugün `consume_photo_quota` trigger'ı yalnızca kişisel `entitlements.is_pro`'ya bakıyor. Yeni kural:

- Kağıdın `org_id`'si varsa ve o kurumun planı aktifse → **kota uygulanmaz**.
- Kişisel kota hesabı aynı kalır (aynı anda 3 fotoğraflı kağıt, silince hak geri gelir).
- Kullanıcı "sınırsız" sayılır eğer: kişisel Pro **ya da** aktif planlı bir kurumun üyesiyse.
- Kurumun planı aktif mi (`org_plan_active`): **aile** için sahibinin `entitlements` satırı (`is_pro and plan='family'`), **işletme** için `organizations.plan='business'`.

```sql
create or replace function public.has_unlimited_sheets(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    coalesce((select is_pro and (pro_until is null or pro_until > now())
                from public.entitlements where user_id = p_user), false)
    or exists (
      select 1 from public.org_members m
       where m.user_id = p_user and public.org_plan_active(m.org_id)
    );
$$;
```

`consume_photo_quota` içindeki `pro` hesabı bu fonksiyonla değiştirilir; ayrıca en başa `if new.org_id is not null and <org planı aktif> then return new; end if;` eklenir.

**Koltuk limiti** ayrı bir trigger ile `org_members` INSERT üzerinde uygulanır: `count(*) >= seat_limit` ise `raise exception 'seat_limit_exceeded'`.

---

## 7. RLS — en kritik parça

Bugün tüm politikalar `user_id = auth.uid()` üzerine kurulu. Paylaşımla birlikte kural şu hâle gelir: **sahibiyim VEYA kağıdın kurumunda üyeyim VEYA geçerli bir grant'im var.**

Yardımcı fonksiyonlar `security definer` olmalı — aksi hâlde `org_members` politikası kendini sorgulayıp **sonsuz özyinelemeye** girer (Supabase'de en sık yapılan RLS hatası):

```sql
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
```

Mevcut `for all` politikası okuma/yazma için ayrılır:

```sql
drop policy if exists "sheets_owner" on public.sheets;

create policy "sheets_select" on public.sheets for select
  using (user_id = auth.uid()
         or (org_id is not null and public.is_org_member(org_id))
         or public.has_sheet_grant(id));

create policy "sheets_insert" on public.sheets for insert
  with check (user_id = auth.uid()
              and (org_id is null or public.is_org_member(org_id)));

create policy "sheets_update" on public.sheets for update
  using      (user_id = auth.uid() or (org_id is not null and public.is_org_admin(org_id)))
  with check (user_id = auth.uid() or (org_id is not null and public.is_org_admin(org_id)));

create policy "sheets_delete" on public.sheets for delete
  using (user_id = auth.uid() or (org_id is not null and public.is_org_admin(org_id)));
```

- `sheet_rows`: SELECT → `public.can_read_sheet(sheet_id)`; INSERT/UPDATE/DELETE → yalnızca sahip/admin.
- `sessions`: her zaman `user_id = auth.uid()`; INSERT'te ek koşul `public.can_read_sheet(sheet_id)`. Yani müşteri kafenin kağıdına kendi oyununu açabilir, başkasının oyununu göremez.
- `session_rows`, `strokes`: bugünkü gibi parent session'ın sahibine bağlı.
- Storage: `sheets_storage_read` politikası klasör adı yerine `public.can_read_sheet(split_part(name,'.',1)::uuid)` ile yazılır; yazma yalnızca sahip/admin.

**Gizlilik notu:** kafe, müşterilerinin oyun satırlarını **görmemeli**. Panel için `sessions` üzerinde kuruma okuma izni vermeyin; bunun yerine yalnızca sayaç döndüren `security definer` bir fonksiyon yazın (ör. `org_play_stats(org_id, from, to)` → oyun başına adet). Ham veri hiç dışarı çıkmaz.

### Token kullanımı (RPC)

```sql
create or replace function public.redeem_share_token(p_token text)
returns setof uuid                         -- erişim verilen sheet id'leri
language plpgsql security definer set search_path = public as $$
declare l public.share_links;
begin
  select * into l from public.share_links
   where token = p_token and not revoked
     and (expires_at is null or expires_at > now())
     and (max_uses  is null or uses < max_uses);
  if not found then raise exception 'invalid_share_token'; end if;

  insert into public.share_grants (user_id, sheet_id, org_id, token, expires_at)
  select auth.uid(), s.id, l.org_id, l.token, l.expires_at
    from public.sheets s
   where (l.kind = 'sheet'   and s.id     = l.sheet_id)
      or (l.kind = 'catalog' and s.org_id = l.org_id)
  on conflict (user_id, sheet_id)
    do update set granted_at = now(), expires_at = excluded.expires_at;

  update public.share_links set uses = uses + 1 where id = l.id;

  return query select g.sheet_id from public.share_grants g
                where g.user_id = auth.uid() and g.token = l.token;
end;
$$;
```

---

## 8. İstemci tarafı değişiklikleri

**`lib/db/sync.ts`** — `pullAll` bugün `sheets`'i `.eq('user_id', userId)` ile çekiyor; paylaşılan kağıtlar hiç inmez. Filtre **kaldırılmalı**: RLS zaten görünürlüğü belirliyor, `select('*')` tam olarak görebildiğimiz kümeyi döndürür. `sheet_rows` sorgusu da artık org kağıtlarının satırlarını kapsayacak.

**`lib/db/repository.ts`** — `listSheets(userId)` `s.user_id === userId` filtresini uyguluyor; paylaşılan kağıtlar bu yüzden listede görünmez. Filtre kaldırılıp yerine sahiplik bilgisi eklenmeli:

```ts
export interface SheetSummary extends Sheet {
  rowCount: number;
  sessionCount: number;
  isOwner: boolean;      // düzenle/sil butonlarını buna göre göster
  source: 'own' | 'org' | 'shared';
}
```

Sahibi olmadığın kağıtta `saveSheet`/`deleteSheet` **istemci tarafında da** engellenmeli (sunucu zaten reddeder, ama outbox'a düşüp sonsuza kadar hata döndürmesin — bkz. §10).

**Yeni ekranlar**

- `app/join/[token].tsx` — token kullanma: anonim giriş → `redeem_share_token` → başarılıysa kağıda/kataloğa yönlendir, hata durumunda ("süresi dolmuş", "iptal edilmiş") anlaşılır mesaj.
- `app/org/index.tsx` — aile: üyeler, davet linki, koltuk sayacı (`3/5`), plan durumu. "Aile oluştur" adımı yok; plan varsa aile kendiliğinden açılır.
- `lib/links.ts` — dışa verilen `https` bağlantılar (`EXPO_PUBLIC_LINK_BASE`) + giriş öncesi tıklanan davetin saklanması.
- `lib/purchases.ts` — RevenueCat bağlantı noktası (`buyPlan`, `restorePurchases`); paywall yalnızca bunu çağırır.
- `web/` — GitHub Pages'e (`refill-legal` reposu, Watchbase ile aynı düzen) yayınlanan statik site: `join.html` (+ `404.html` kopyası) bağlantı sayfası, `refill://` ile uygulamayı açmayı dener, olmazsa mağaza + "tekrar aç"; Faz C'deki `/s/<token>` de aynı sayfadan geçer. Yanında `privacy.html`, `terms.html`, `account-deletion.html`.
- `app/org/qr/[sheetId].tsx` — QR göster / yazdır / paylaş; token iptal etme.
- `app/paywall.tsx` — üç plan gösterecek şekilde güncellenir; Business "bize ulaşın" akışına gider (bkz. §9).
- `app/(tabs)/index.tsx` — paylaşılan kağıtlar için rozet, sahibi değilse silme butonu gizli.

**Yeni bağımlılıklar:** `react-native-qrcode-svg` (mevcut `react-native-svg` üzerine biner), yazdırma için `expo-print` + `expo-sharing`. Uygulama içi tarayıcı gerekirse `expo-camera` — ama telefonun kendi kamerası yeterli olduğu için v1'de gereksiz.

**Supabase dashboard:** Anonim giriş (Anonymous sign-ins) etkinleştirilmeli.

---

## 9. Ödeme ve telif

**Ödeme kanalı ayrımı önemli:**

- **Bireysel + Aile:** uygulama içi satın alma (RevenueCat). Apple/Google dijital abonelikte kendi ödeme sistemini zorunlu kılar.
- **Business:** uygulama içinden **satılmaz**. Kafeye fatura/Stripe ile satılır; uygulamada yalnızca "işletme kodunu gir" alanı olur. Uygulama içinde satarsanız %15-30 komisyon ve mağaza kuralları devreye girer; B2B satışta buna gerek yok.

**Telif riskini azaltıcı önlemler** (§0'daki karar "devam" ise bunlar zorunludur):

- Bucket **asla public yapılmaz**; erişim daima imzalı URL + `can_read_sheet()` üzerinden.
- `share_links` her zaman **iptal edilebilir** ve tercihen **süreli** olur (ör. kafe için 1 yıl, plan bitince otomatik ölür).
- Business sözleşmesinde kafeye "yalnızca fiziksel olarak sahip olduğun oyunların kağıtlarını yükleyeceksin" taahhüdü konur.
- Uygulama **hiçbir zaman** kağıtları arama/keşif için listelemez; erişim yalnızca doğrudan token ile olur. Bu, ürünü bir "şablon kütüphanesi" olmaktan uzak tutar — kural #1'in asıl koruduğu şey buydu.
- Yayıncıdan şikâyet gelirse ilgili kağıdı ve token'ı kapatacak bir "takedown" mekanizması (revoked bayrağı zaten var).

---

## 10. Tuzaklar

- **RLS özyinelemesi.** `org_members` politikaları kendi tablosunu sorgularsa Postgres sonsuz döngüye girer. Tüm üyelik kontrolleri `security definer` fonksiyonlar üzerinden yapılmalı.
- **Outbox zehirlenmesi.** `lib/db/sync.ts` ilk hatada durur ve kuyruğu korur. Sahibi olmadığın kağıda yapılan bir yazma denemesi outbox'a düşerse sunucu sürekli reddeder ve **tüm senkron kalıcı olarak tıkanır**. İki önlem: (a) istemcide yazmayı baştan engelle, (b) sync'e "kalıcı hata (403/409) olan kaydı kuyruktan at ve logla" davranışı ekle.
- **`setAll` ile yerel ezme.** Pull, tabloları komple değiştiriyor. Paylaşılan kağıtlar geldiğinde kendi kağıtlarının silinmediğinden emin ol; `pullAll` artık daha geniş bir küme döndürdüğü için bu doğal olarak çalışır, ama testi yazılmalı.
- **Anonim kullanıcı birikmesi.** Her tarama yeni bir anonim kullanıcı yaratır ve bunlar aylık aktif kullanıcı sayısına dahildir. Hiç oyun kaydetmeden terk edilen anonim hesaplar için periyodik temizlik işi planla.
- **QR'ı doğrudan mağazaya bağlama.** Token kaybolur, kurulu kullanıcı da mağazaya düşer ve tekrar okutma döngüye girer (bkz. §5.1). QR daima `https` yönlendirme sayfasını göstermeli.
- **Basılı QR geri alınamaz.** URL tabanını (alan adı / Edge Function yolu) ilk günden kesinleştir; sonradan değiştirmek kafelere dağıtılmış tüm etiketleri çöpe atar. Token'ı değil, **taban URL'i** kalıcı seç.
- **Uygulama içi tarayıcıyı tek yol yapma** — yalnızca kurulu kullanıcılar için çalışır, ilk müşteri deneyimini kırar.
- **Kotanın istemci tarafı iyimserdir.** `remainingPhotoSheets` yerel listeden hesaplıyor; org kağıtları bu sayıma **girmemeli**, yoksa kafe çalışanı kendi kotasını tüketmiş görünür.

---

## 11. Fazlar

Her fazın sonunda uygulama çalışır durumda olmalı.

### Faz A — Storage yüklemesi (ön koşul, bağımsız değerli) — ✅ TAMAMLANDI (2026-08-05)
- [x] Kağıt kaydında görsel kalıcı yerel dizine kopyalanır, `image_path` = Storage yolu (`{user_id}/{sheet_id}.jpg`), yükleme kuyruğa girer (`lib/images.ts`, `lib/db/repository.ts`).
- [x] Gösterimde önce yerel dosya, yoksa imzalı URL + arka planda indirme (`hooks/useSheetImage.ts`); çevrimdışında kendi kağıdın görünür.
- [x] Kağıt silinince yerel dosya silinir, Storage nesnesi silme kuyruğuna girer.
- [x] Görsel kuyruğu satır senkronundan ayrı (`pushImages`): başarısız bir yükleme veri senkronunu bloklamaz.
- [x] Storage öncesi ham `file://` kayıtları kurtaran `migrateLegacyImages()`.
- [x] Çıkışta yerel görseller de silinir (gizlilik).
- [x] `supabase/schema.sql` değişmedi — dosya düzeni korundu (bkz. §3).

### Faz B — Kurumlar ve Aile paketi — kod tamam, şema uygulanmayı bekliyor
- [x] `supabase/schema_orgs.sql`: `organizations`, `org_members`, `org_invites`, `share_grants` + koltuk limiti trigger'ı + `create_organization` / `redeem_org_invite` RPC'leri.
- [x] `sheets.org_id` + RLS'in yeniden yazımı (§7) + `has_unlimited_sheets` ile kota entegrasyonu + storage okuma politikası.
- [x] `sync.ts` (kurum/üyelik pull, sheets'te user_id filtresinin kaldırılması) ve `repository.ts` (`canEdit`/`source`, `setSheetOrg`, yetkisiz yazma koruması).
- [x] `lib/orgs.ts`, aile ekranı (`app/org/index.tsx`), davetle katılma (`app/org/join/[token].tsx`), profilde giriş noktası, 13 dilde `org.*` metinleri.
- [x] (2026-09-09) Koltuk 5; "aile oluştur" adımı kaldırıldı, aile plan görülünce kendiliğinden açılıyor; plan kaynağı `entitlements.plan` + `plan_active` hesaplanmış alanı; davet linki `https` + giriş sonrası bekleyen davet; `lib/purchases.ts` seam'i.
- [ ] **Şemayı Supabase SQL editöründe çalıştır** — bunsuz aile akışı çalışmaz (uygulama bozulmaz, yalnızca aile kurulamaz). Dosyanın sonundaki doğrulama sorgusunu ve ödeme olmadan denemek için `entitlements` güncelleme örneğini kullan.
- [ ] `web/` içeriğini `ymrdgn/refill-legal` reposuna (GitHub Pages) yayınla ve `EXPO_PUBLIC_LINK_BASE=https://ymrdgn.github.io/refill-legal` olarak `.env`'e yaz (karar 2026-09-10: alan adı alınmadı, Watchbase gibi GitHub Pages). Basılı QR (Faz C) gelince kalıcı alan adı yeniden değerlendirilir.
- [ ] `web/join.html` ve `404.html` içindeki App Store adresi yayınlanınca doldurulacak; yasal sayfalardaki destek e-postası (`REFILL_SUPPORT_EMAIL`) gerçek adresle değiştirilecek.
- [ ] Aile planının satın alınması → Faz E (`buyPlan` gerçek RevenueCat çağrısına bağlanır; webhook `entitlements.plan='family'` yazar).

> Not: `share_grants` tablosu Faz B'de **boş** oluşturuldu. Sebep: RLS politikalarını iki kez yeniden yazmamak. Faz C yalnızca `share_links` + `redeem_share_token` ekleyecek, politikalara dokunmayacak.

### Faz C — QR ve Business
- [ ] §0'daki telif kararı verilmiş ve `CLAUDE.md` güncellenmiş olmalı.
- [ ] `share_links`, `share_grants`, `redeem_share_token` RPC.
- [ ] **Kalıcı URL tabanına karar ver** (kendi alan adı önerilir; alternatif: Supabase Edge Function ya da ücretsiz alt alan adı) — basılı QR'lar buna bağlanacak.
- [ ] `https` yönlendirme sayfası: token → `refill://s/<token>` denemesi → başarısızsa platforma göre mağaza + "tekrar okut" mesajı.
- [ ] (Opsiyonel cila) universal link / app link dosyaları: `apple-app-site-association` + `assetlinks.json`.
- [ ] Anonim giriş, `app/join/[token].tsx`, oyun sonrası hesap yükseltme kancası.
- [ ] QR üretme/yazdırma ekranı, token iptali.

### Faz D — Kafe paneli
- [ ] Yalnızca sayaç döndüren `org_play_stats` fonksiyonu (ham veri paylaşılmaz).
- [ ] Web panel: oyun bazlı oynanma sayısı, saat dağılımı, QR yönetimi.

### Faz E — Fiyatlandırma
- [ ] RevenueCat: Bireysel + Aile ürünleri; `lib/purchases.ts` içindeki `buyPlan`/`restorePurchases` gerçek çağrılara bağlanır.
- [ ] Webhook (service role) yalnızca `entitlements` yazar: `is_pro`, `pro_until`, `plan` ('individual' | 'family'). Aile kaydına dokunmaz.
- [ ] Business: Stripe/fatura + "işletme kodu" eşleme akışı.

---

## 12. Test kontrol listesi

- [ ] Aile planı olan kullanıcı aile ekranını açınca aile kendiliğinden oluşuyor ve "davet et" görünüyor.
- [ ] Davetle katılan üye sınırsız fotoğraf kağıdı hakkı alıyor; koltuk limiti dolunca 6. kişi eklenemiyor.
- [ ] Giriş yapmamış kişi davet linkine tıklayınca giriş sonrası katılma ekranına otomatik dönüyor.
- [ ] Sahibin planı bitince üyelerin sınırsız hakkı düşüyor, davet butonu kapanıyor.
- [ ] QR tarayan kullanıcı kağıdı görüyor, oyun açıp kaydedebiliyor; kağıdı **düzenleyemiyor/silemiyor**.
- [ ] Token iptal edilince erişim anında kesiliyor; süresi dolan grant çalışmıyor.
- [ ] Başka bir kafenin kağıdı, token olmadan hiçbir sorguda görünmüyor (RLS sızıntı testi).
- [ ] Kafe, müşterinin oyun satırlarını ham hâlde okuyamıyor; yalnızca sayaç görüyor.
- [ ] Org kağıdı, kafe çalışanının kişisel 3'lük kotasını tüketmiyor.
- [ ] Uçak modunda paylaşılan kağıtla oyun açılıp kaydediliyor; online olunca senkron oluyor.
- [ ] Reddedilen bir yazma outbox'ı kalıcı olarak tıkamıyor.
- [ ] Uygulama kurulu değilken QR taraması mağazaya yönlendiriyor.

---

## 13. Açık sorular

1. **QR'ın kalıcı URL tabanı ne olacak?** Kendi alan adı mı, Supabase Edge Function mı, ücretsiz alt alan adı mı? (Alan adı zorunlu değil ama basılı QR geri alınamadığı için önerilir — bkz. §5.1.)
2. Telif kararı (§0): devam mı, yoksa paylaşım yalnızca **boş/kullanıcının kendi çizdiği** kağıtlarla mı sınırlansın? İkincisi riski büyük ölçüde kaldırır ama kafe senaryosunu zayıflatır.
3. Kafe paneli nerede yaşayacak — ayrı bir web uygulaması mı, Expo web mi?
4. Fiyatlar: kafenin aylık kağıt gideri ne kadar? Çıpa oradan kurulmalı.
5. ~~Aile paketinde kağıtlar ortak mı olacak?~~ **Karar (2026-09-09): hayır.** Aile yalnızca koltuk paketidir; kağıt paylaşımı Business/QR'a özeldir (bkz. §0.1).
