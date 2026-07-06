# CLAUDE.md — Refill (proje yönergesi)

**Uygulama adı:** Refill — Board Game Scores · kısa marka / ikon adı: **Refill** · proje slug: `refill`

Bu dosyayı her oturumun başında oku. Uygulamayı **React Native + Expo (dev build) + Supabase** ile kuruyoruz. Detaylı ürün ve teknik şartname `PROJECT_BRIEF.md`, adım adım yol haritası `BUILD_PLAN.md`, veritabanı `supabase/schema.sql` dosyasında.

## Tek cümlelik ürün
Kullanıcı, masaüstü oyunlarının kendi skor kağıdının **fotoğrafını** çekip dijital "yeni kopya" gibi kullanır: fotoğrafın üzerine **parmağıyla/kalemle skoru yazar**, uygulama yazıyı **satıra bağlı veriye** çevirir ve her oynanışı **geçmişte** saklar. Fiziksel kağıtları bittiği için bu uygulamayı kullanırlar.

## Değişmez kurallar (guardrails)
1. **Telifli içerik yok.** Uygulamanın içine hiçbir oyun ismi, logosu, kategori listesi veya resmi skor kağıdı tasarımı **gömülmez**. Tüm kağıt görselleri **kullanıcıdan** gelir ve **özeldir** (private). Örnek/şablon kütüphanesi, kullanıcılar arası görsel paylaşımı **eklenmez** (telif riskini geri getirir). Jenerik örnekler kabul (kullanıcının kendi çizdiği test kağıdı gibi).
2. **Koordinatlar piksel değil orandır.** Satır konumları ve kalem izleri (strokes) her zaman `0..1` aralığında oran olarak saklanır; ekran boyutundan/zoomdan bağımsız çalışır.
3. **Offline-first.** Yazma ve geçmiş internetsiz çalışmalı; Supabase'e senkron arka planda olur. Veri kaybı olmamalı.
4. **Tanıma (recognition) opsiyonel bir katmandır.** Çekirdek akış tanıma olmadan da %100 kullanılabilir (kullanıcı değeri elle onaylar/yazar). Tanıma sadece bu alanı önceden doldurur.
5. **Gizlilik.** Görseller private Storage bucket'ında, satır başına RLS ile yalnızca sahibine açık.

## Teknik kararlar (özet)
- **Expo SDK:** en güncel sürüm. Kurulum: `npx create-expo-app@latest`. **Expo Go kullanma**; ML Kit native olduğu için **expo-dev-client + EAS dev build** şart.
- **Navigasyon:** `expo-router`.
- **Çizim/ink:** jest hareketleri için `react-native-gesture-handler`, çizim için `@shopify/react-native-skia` (tercih) veya `react-native-svg`. Strokeları oran tabanlı nokta dizileri olarak tut.
- **Backend:** Supabase (Auth + Postgres + Storage). RLS her tabloda açık.
- **Yerel cache:** `expo-sqlite` (veya basit bir AsyncStorage + outbox kuyruğu) ile offline-first; bağlantı gelince Supabase'e push/pull.
- **Tanıma (Faz 2):** Google ML Kit **Digital Ink Recognition** (on-device, çevrimdışı). Önce topluluk paketini dene (`react-native-digital-ink` / `@nahrae/react-native-digital-ink`); çalışmazsa **Expo Modules API ile kendi native köprünü yaz** (Android: `com.google.mlkit:digital-ink-recognition`, iOS: `GoogleMLKit/DigitalInkRecognition`). Cloud servisi (MyScript vb.) son çare; offline hedefini bozar.

## Çalışma tarzı
- Küçük, test edilebilir adımlarla ilerle (bkz. `BUILD_PLAN.md` fazları). Her fazın sonunda uygulama çalışır halde olmalı.
- Önce şemayı ve tipleri (TypeScript) kur, sonra ekranlar, en son senkron ve tanıma.
- Sırları `.env` / EAS secrets ile yönet; Supabase anon key dışında bir şey commit etme.
- Belirsizlik olursa varsayımını yaz, devam et, sonradan düzeltilebilir tut.

## Kabul kriteri (MVP)
Kullanıcı: kayıt/giriş yapar → kağıt fotoğrafı ekler → satırları işaretler → o kağıtta "yeni oyun" açar → fotoğraf üzerine kalemle yazar → değerleri (elle) onaylar → kaydeder → geçmişte el yazısı + veriyle görür. Hepsi offline çalışır, online olunca Supabase'e senkron olur.
