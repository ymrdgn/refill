# STORE_CHECKLIST.md — Mağazaya çıkış kontrol listesi

Son güncelleme: 2026-09-10. Paket işi (Bireysel + Aile) mağaza işinin parçasıdır ve
**çıkıştan önce** bitmelidir: mağazalar abonelik ürünlerini zaten ister, Apple inceleme
sırasında satın almayı sandbox'ta dener, sonradan kota koymak eski kullanıcıları küstürür.

## 1. Bloke edenler — ✅ tamam (2026-09-10)
- [x] `supabase/schema_orgs.sql` uygulandı (doğrulama 6/6). Senkron outbox'ı açıldı.
- [x] Aile paketi + satır işaretlemenin kaldırılması commit'lendi.

## 2. Altyapı kararları — ✅ karar verildi (2026-09-10)
- [x] **Alan adı yok.** Yasal sayfalar ve davet yönlendirmesi GitHub Pages'te:
      `ymrdgn/refill-legal` → `https://ymrdgn.github.io/refill-legal/` (kaynak: `web/`, bkz. `web/README.md`).
- [x] **Supabase ücretsiz kalıyor.** `.github/workflows/supabase-keepalive.yml` günlük ping atar
      (sırlar: `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Yedek yok; gelir gelince Pro.
- [ ] `.env` → `EXPO_PUBLIC_LINK_BASE=https://ymrdgn.github.io/refill-legal`
- [ ] Yasal sayfalardaki `REFILL_SUPPORT_EMAIL` yer tutucusu (ayrı bir destek Gmail'i öneriliyor).

## 3. Mağaza zorunlulukları (kod) — ✅ kod tamam (2026-09-10)
- [x] **Hesap silme:** `delete_my_account()` RPC (`supabase/schema_account.sql`, uygulandı) +
      `lib/account.ts` (önce Storage dosyaları, sonra RPC, sonra yerel temizlik) + Profil'de "Hesabı sil".
- [x] **Sign in with Apple:** `expo-apple-authentication`, `app.json` → `ios.usesAppleSignIn`,
      `lib/supabase.ts` → `signInWithApple` (`signInWithIdToken`), giriş ekranında Apple'ın resmi düğmesi (yalnızca iOS).
- [x] **Paywall:** yenileme koşulu metni + Gizlilik / Şartlar bağlantıları (`legalUrl()`).
- [x] Kamera/galeri izin metinleri `app.json`'da mevcut.
- [ ] Supabase → Authentication → Providers → **Apple** etkinleştir, Client IDs = `com.refill.app`.
- [ ] Apple Developer: App ID'de "Sign in with Apple" yeteneği (EAS build `usesAppleSignIn` ile ister).
- [ ] Hesap silmeyi test hesabıyla dene (ör. `testrf@gmail.com`, verisi yok).
- [ ] iOS'ta Apple girişini gerçek cihazda dene (Android'de düğme görünmez).

## 4. Ödeme (RevenueCat) — ⬜
- [ ] App Store Connect + Play Console: yıllık **Bireysel** ve **Aile** abonelik ürünleri.
- [ ] RevenueCat projesi, teklif (offering) ve iki mağaza bağlantısı.
- [ ] `lib/purchases.ts` → `buyPlan` / `restorePurchases` gerçek çağrılara bağlanır; paywall fiyatı offering'den okur.
- [ ] Webhook (service role) yalnızca `entitlements` yazar: `is_pro`, `pro_until`, `plan` ('individual' | 'family').
- [ ] Sandbox: satın al, geri yükle, iptal, aile ekranında ailenin kendiliğinden açılması.

## 5. Build ve test — ⬜
- [ ] EAS production build (iOS + Android). Bundle/package: `com.refill.app`.
- [ ] iOS gerçek cihaz: Google girişi (hiç denenmedi), Apple girişi, foto ekleme, yazma.
- [ ] Android release keystore SHA-1 → Google Cloud OAuth (yoksa mağaza sürümünde Google girişi çalışmaz).
- [ ] Uçak modunda yaz-kaydet-geçmiş, online olunca senkron.
- [ ] Davet linki: kurulu cihazda uygulamayı açıyor, kurulu olmayanda mağaza sayfası.
- [ ] 2–3 dilde hızlı tur (tr, en, bir RTL dil).

## 6. Mağaza listesi — ⬜
- [ ] İkon, splash, ekran görüntüleri (telefon; iOS 6.7" + Android).
- [ ] Açıklama ve anahtar kelimeler (tr + en), kategori.
- [ ] Gizlilik formu: Apple "App Privacy" ve Google "Data safety" (toplanan: e-posta, kullanıcı içeriği/fotoğraf; analitik yok).
- [ ] `web/join.html` + `404.html` içindeki App Store adresi (yayın sonrası id gelince).
- [ ] Yaş sınırı 13+, telif notu ("oyunlarla ilişkili değildir").

## Mağaza sonrası
- Faz C (QR + Business): §0 telif kararı + `CLAUDE.md` kural #1; kalıcı URL tabanı (alan adı) o zaman yeniden değerlendirilir.
- Kafe paneli, anonim giriş, `share_links`.
