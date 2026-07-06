# BUILD_PLAN.md — fazlar

Her faz sonunda uygulama **çalışır** olmalı. Sırayla ilerle; tanımayı en sona bırak.

## Faz 0 — İskele
- [ ] `npx create-expo-app@latest refill` (TypeScript, expo-router şablonu).
- [ ] `npx expo install expo-dev-client expo-router react-native-gesture-handler react-native-reanimated @shopify/react-native-skia react-native-svg expo-image-picker expo-file-system expo-sqlite @supabase/supabase-js @react-native-async-storage/async-storage`
- [ ] `eas init`; development profilini ayarla. **Expo Go değil** dev build kullanılacağını doğrula (`npx expo run:android` veya EAS dev build).
- [ ] Tema/tasarım tokenları (renkler, tipografi) ortak bir `theme.ts`'e koy. (Mevcut prototipdeki palet: pine `#1E3A33`, sage bg `#E7ECE7`, ochre `#C2702A`, pen `#27408B`.)

## Faz 1 — Supabase + Auth
- [ ] Supabase projesi oluştur; `supabase/schema.sql`'i SQL editöründe çalıştır.
- [ ] `sheets` adında **private** storage bucket oluştur.
- [ ] `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. `lib/supabase.ts` client (AsyncStorage ile session persistence).
- [ ] E-posta/parola auth ekranı; oturum durumuna göre yönlendirme.
- [ ] `supabase gen types typescript` ile DB tiplerini üret.

## Faz 2 — Yerel veri katmanı (offline-first)
- [ ] `expo-sqlite` ile yerel şema (sheets, sheet_rows, sessions, session_rows, strokes) — Supabase şemasının aynası.
- [ ] Repository katmanı: tüm okuma/yazma **önce yerelde**. Yazmalar bir `outbox` tablosuna iş kaydı bırakır.
- [ ] Basit senkron servis: online olunca outbox → Supabase push; sonra pull (updated_at). İlk sürüm: son-yazan-kazanır.

## Faz 3 — Kağıt ekleme & satır işaretleme
- [ ] Home: kullanıcının sheet'leri (thumbnail + ad + satır/oyun sayısı), "Yeni kağıt ekle".
- [ ] `expo-image-picker` ile kamera/galeriden foto; yerele kaydet, Storage'a yükle, `image_path` sakla.
- [ ] Sheet setup: foto üzerinde dokunarak satır (y oranı) ekleme, satır etiketi (opsiyonel), sürükle/sil. Oran tabanlı sakla.

## Faz 4 — Kalemle yazma (çekirdek deneyim)
- [ ] Çizim view'i: `react-native-gesture-handler` Pan + Skia/SVG ile canlı çizim.
- [ ] Noktaları orana çevir (`0..1`), her noktaya zaman damgası ekle. Pen-up'ta stroke'u en yakın `row.y`'ye ata.
- [ ] "Tanınan değerler" paneli: her satır için değer alanı (şimdilik elle girilir/onaylanır), inkli satır vurgulanır.
- [ ] Undo (son stroke), oyun adı, kaydet. Kayıtta strokes + values yerele yazılır, senkron kuyruğa girer.
- [ ] History + Session detay (salt-okunur: foto + ink + değerler).

> Bu fazın sonunda **MVP biter** — ürün tanımasız tam çalışır.

## Faz 5 — Tanıma (ML Kit Digital Ink) — opsiyonel iyileştirme
- [ ] Önce paket dene: `react-native-digital-ink` ya da `@nahrae/react-native-digital-ink`. Dev build'de gerçek cihazda doğrula.
- [ ] Çalışmazsa **Expo Modules API** ile native modül yaz:
  - Android: `com.google.mlkit:digital-ink-recognition`, model indir (`en-US`), `Ink` (stroke + timestamped points) → `DigitalInkRecognizer.recognize()`.
  - iOS: pod `GoogleMLKit/DigitalInkRecognition`, gerçek cihaz (simülatör desteklemez).
- [ ] Her satırın strokeları → o satırın yazı-alanı boyutuyla, tek satır olarak recognize → sonucu o satırın `value`'suna **öneri** olarak koy. Kullanıcı onaylar/düzeltir (asla otomatik kabul etme).
- [ ] Doğruluk ayarı: yazı alanını recognizer'a bildir; gerekiyorsa rakam ön-bağlamı ver.

## Faz 6 — Cila
- [ ] Çoklu oyuncu (opsiyonel): aynı kağıtta birden çok oyuncu için ayrı değer setleri/renkler — gerekirse veri modelini genişlet.
- [ ] Geçmiş analitiği (bir satırın zaman içindeki değer grafiği).
- [ ] Hata/empty state'ler, yükleme göstergeleri, kalem/silgi geçişi, satır yanlış atanırsa elle düzeltme.

## Test kontrol listesi
- [ ] İki farklı ekran boyutunda ink ve satırlar doğru hizada (oran doğrulaması).
- [ ] Uçak modunda yaz-kaydet-geçmiş çalışıyor; online olunca senkron oluyor.
- [ ] RLS: başka kullanıcının sheet/session/görseline erişilemiyor.
- [ ] (Faz 5) Gerçek cihazda rakam tanıma + düzeltme akışı.
