/**
 * languages.ts — desteklenen dillerin TEK kaynağı.
 *
 * Yeni dil eklerken: `locales/<code>.json` dosyasını oluştur, buraya bir satır
 * ekle ve `i18n.ts` içindeki resources haritasına import et. Başka yere dokunma.
 *
 * Etiketler kasıtlı olarak DİLİN KENDİSİNDE yazılır: dili bulamayan kullanıcı
 * listeyi kendi alfabesinde tarayabilsin.
 */
export interface Language {
  /** i18next kodu — dosya adıyla birebir aynı (locales/<code>.json) */
  code: string;
  /** Dilin kendi yazımıyla adı */
  label: string;
  /** Sağdan sola yazılan diller (yerleşim için, bkz. app/(tabs)/profile.tsx) */
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'ku', label: 'Kurdî' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'fa', label: 'فارسی', rtl: true },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function findLanguage(code: string | undefined): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function isRTL(code: string | undefined): boolean {
  return findLanguage(code)?.rtl === true;
}
