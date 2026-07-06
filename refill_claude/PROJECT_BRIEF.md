# PROJECT_BRIEF.md — Refill — Board Game Scores

## 1. Problem ve fikir
Masaüstü oyunlarının (örn. arazi yerleştirme / habitat puanlama tarzı oyunlar) skor kağıtları defter halinde gelir ve biter. Kullanıcı, kağıdının **fotoğrafını** çekip uygulamada sınırsız "yeni kopya" gibi kullanır. Fotoğrafın üzerine **parmak/kalemle** skorları yazar; uygulama bunu yapılandırılmış veriye çevirir ve oynanış geçmişini tutar.

Bu yaklaşım aynı zamanda **hukuki açıdan en güvenli** olandır: uygulama hiçbir telifli içerik barındırmaz; kağıt görseli kullanıcının kişisel kopyasıdır ve özel kalır.

## 2. Temel kavramlar (veri modeli mantığı)
- **Sheet (Kağıt / layout):** bir fotoğraf + o fotoğraf üzerinde tanımlı **satırlar**. Bir kez kurulur, defalarca kullanılır.
- **Row (Satır):** kağıttaki bir puan satırı. Sadece bir `y` oranı (0..1) ve opsiyonel bir etiket (ör. "Ayı"). Etiketi kullanıcı ister verir; jeneriktir, markayla ilgisi yoktur.
- **Session (Oyun):** bir kağıdın tek bir oynanışı. İçinde: oyun adı, tarih, **strokes** (kalem izleri) ve **values** (her satırın tanınan/onaylanan değeri).
- **Stroke (Kalem izi):** oran tabanlı nokta dizisi `[{x,y}, ...]` + bağlandığı `rowId`. Görsel olarak el yazısını, veri olarak hangi satıra ait olduğunu taşır.

Önemli ilke: **uygulama tahtayı/fotoğrafı analiz etmez.** Kullanıcı yazar; uygulama yazıyı satıra göre gruplar, (Faz 2'de) tanır ve saklar. Toplam puanı kullanıcı kendi kağıdına yazar — uygulama otomatik toplam yapmaz (kapsam dışı, basit tut).

## 3. Ekranlar
1. **Auth** — Supabase e-posta/parola (veya magic link). 
2. **Kağıtlarım (Home)** — kullanıcının sheet'leri (thumbnail + ad + satır/oyun sayısı). "Yeni kağıt ekle" (kamera/galeri).
3. **Satırları işaretle (Sheet setup)** — fotoğraf gösterilir; kullanıcı her puan satırının hizasına dokunarak satır (y oranı) ekler; opsiyonel isim verir; kaydeder. Satırlar sürüklenip silinebilir.
4. **Oyun (Play / write)** — fotoğraf + üstüne **kalemle yazma**. Kalem izleri canlı çizilir, pen-up'ta en yakın satıra bağlanır. Altta "Tanınan değerler" paneli: her satırın değeri (Faz 2'de tanıma otomatik doldurur; her zaman elle düzeltilebilir). Üstte oyun adı, "geri al" (undo), "kaydet".
5. **Geçmiş (History)** — bir kağıdın oynanışları (ad + tarih). Tıklayınca:
6. **Oyun detayı (Session, salt-okunur)** — fotoğraf + kalem izleri + kaydedilen değerler.

## 4. Yazma & tanıma mimarisi (kritik bölüm)
### Yakalama (capture)
- Çizim alanı, fotoğrafı saran bir view. `react-native-gesture-handler` Pan gesture ile dokunuş noktaları toplanır.
- Her nokta **oran**a çevrilir: `x = (touchX - layoutX) / width`, `y = (touchY - layoutY) / height`, `0..1`'e clamp.
- Pen-down → yeni stroke; pen-move → nokta ekle (canlı render `@shopify/react-native-skia` veya `react-native-svg` polyline); pen-up → stroke biter, **satıra atanır**: strokun ortalama `y`'sine en yakın `row.y`.
- Strokeları oran olarak sakla; render ederken ekran boyutuyla çarp. Skia tercih (akıcı, basınç/temiz çizgi); SVG basit alternatif.

### Tanıma (recognition) — Faz 2
- Google ML Kit Digital Ink **strokelarla** (görüntüyle değil) çalışır ve **çevrimdışı**dır. Doğruluk için her satırın strokeları, o satırın **yazı alanı (writing area) boyutuyla** ve tek satır olarak recognizer'a verilir (ML Kit dökümanının önerisi).
- Akış: bir satırın strokeları değişince → recognizer'a gönder → dönen metni o satırın `value` alanına **öneri** olarak yaz → kullanıcı onaylar/düzeltir. Asla sessizce kabul etme; her zaman düzeltilebilir kalsın.
- Paket stratejisi (CLAUDE.md ile aynı): önce `react-native-digital-ink` / `@nahrae/react-native-digital-ink` dene; bakımsızsa **Expo Modules API ile kendi native modülünü** yaz.
  - Android dependency: `com.google.mlkit:digital-ink-recognition`. Model dilini indir (örn. `en-US`; rakamlar için yeterli), `DigitalInkRecognizer`'a `Ink` (stroke + zaman damgalı noktalar) ver.
  - iOS pod: `GoogleMLKit/DigitalInkRecognition`. Simülatörde çalışmaz; **fiziksel cihaz** gerekir.
- Yakalama sırasında her noktaya **zaman damgası (t)** da ekle; ML Kit `Ink` formatı zaman bilgisi ister. (Skia/gesture'da `Date.now()` yeterli.)

### Neden bu ayrım önemli
- Senaryo A (kullanıcı uygulamada canlı yazar → stroke verisi) güvenilirdir. Fotoğraftan (zaten doldurulmuş kağıt) okuma (görüntü-OCR) farklı ve zor bir yoldur; **kapsam dışı**.

## 5. Offline-first & senkron
- Tüm yazma/okuma yerelde (`expo-sqlite`) gerçekleşir. Her değişiklik bir **outbox** kaydı oluşturur.
- Bağlantı varken: outbox → Supabase'e push; Supabase → yerel pull (basit `updated_at` tabanlı). İlk sürümde son-yazan-kazanır yeterli.
- Görseller: yerelde dosya sisteminde tutulur (`expo-file-system`), Supabase Storage'a yüklenir; kayıtta sadece `image_path` saklanır (base64'ü DB'ye gömme).

## 6. Supabase
- **Auth:** e-posta/parola. `auth.uid()` her RLS politikasının temeli.
- **DB:** `supabase/schema.sql` (sheets, sheet_rows, sessions, session_rows, strokes). Stroke noktaları `jsonb`.
- **Storage:** private bucket `sheets`; dosya yolu `{user_id}/{sheet_id}.jpg`. RLS politikası kullanıcıyı kendi klasörüyle sınırlar.
- TypeScript tipleri: `supabase gen types typescript` ile üret.

## 7. Önemli tuzaklar (Claude Code dikkat et)
- **Expo Go yasak** — ML Kit ve bazı native modüller için dev build (`eas build --profile development` ya da `npx expo run:android/ios`).
- **Koordinat oranı** — asla ham piksel saklama; aksi halde başka cihazda kutular/yazılar kayar.
- **iOS simülatöründe ML Kit yok** — tanıma testini gerçek cihazda yap.
- **RLS'i baştan aç** — tabloları RLS kapalı bırakıp sonra açmak veri sızması riski; schema.sql zaten açık geliyor.
- **Tanımayı son bırak** — MVP'yi tanımasız bitir; ürün zaten tam çalışır. Tanıma bir iyileştirme.
