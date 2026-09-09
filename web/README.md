# web/ — Refill'in GitHub Pages sitesi

Watchbase ile aynı düzen: bu klasörün içeriği `ymrdgn/refill-legal` adlı **public**
repoya kopyalanır, Settings → Pages → Branch: `main` / root seçilir.
Adres: `https://ymrdgn.github.io/refill-legal/`

| Dosya | İş |
|---|---|
| `index.html` | Yasal belge listesi (Privacy, Terms, Account Deletion) |
| `privacy.html`, `terms.html`, `account-deletion.html` | Mağaza başvurusu ve paywall için zorunlu sayfalar |
| `join.html` | Davet (ileride QR) bağlantısı: `refill://` ile uygulamayı açmayı dener, olmazsa mağaza |
| `404.html` | `join.html`'in kopyası — GitHub Pages rewrite desteklemediği için `/org/join/<token>` buraya düşer |
| `_style.css` | Ortak stil (Refill renkleri) |
| `vercel.json` | Vercel'e taşınırsa `/org/*` ve `/s/*` → `join.html` |

## İlk yayın

```bash
git clone git@github.com:ymrdgn/refill-legal.git /tmp/refill-legal   # repoyu GitHub'da public olarak açtıktan sonra
cp -R web/. /tmp/refill-legal/ && cd /tmp/refill-legal
git add -A && git commit -m "Add legal pages and invite redirect" && git push
```

Yayından önce:
- `REFILL_SUPPORT_EMAIL` yer tutucusunu üç sayfada gerçek destek adresiyle değiştir:
  `sed -i '' 's/REFILL_SUPPORT_EMAIL/destek@adresin/g' web/*.html`
- `join.html` ve `404.html` içindeki App Store adresini uygulama yayınlanınca doldur.
- `.env`'e `EXPO_PUBLIC_LINK_BASE=https://ymrdgn.github.io/refill-legal` yaz.

`join.html` değişirse `404.html`'i yeniden kopyala: `cp web/join.html web/404.html`.
