/**
 * theme.ts — Refill ortak tasarım tokenları
 *
 * Palet ve tipografi prototipten (refill_claude/prototype-web.jsx) alınmıştır.
 * Tüm ekranlar renkleri/boşlukları buradan okur; sabit hex değeri gömme.
 */

export const colors = {
  /** Sage arka plan (uygulama zemini) */
  bg: '#E7ECE7',
  /** Kart / yüzey rengi (kağıt hissi) */
  surface: '#FCFBF7',
  /** Ana metin — pine (koyu yeşil) */
  ink: '#1E3A33',
  /** İkincil / soluk metin */
  inkSoft: '#67756F',
  /** İnce çizgi / kenarlık */
  line: '#DBE2DC',
  /** Vurgu — ochre (turuncu) */
  accent: '#C2702A',
  /** Vurgu yumuşak dolgu */
  accentSoft: '#F1E3D2',
  /** Başarı / yeşil */
  green: '#3F7D54',
  /** Kalem izi (el yazısı) rengi */
  pen: '#27408B',
  /** Hata */
  danger: '#B4462F',
  /** Beyaz */
  white: '#FFFFFF',
} as const;

/**
 * Tipografi. Uygulama Inter yüklüyor (app/_layout.tsx).
 * display  → başlıklar (Inter-Bold)
 * body     → gövde metni (Inter-Regular / Medium)
 * mono     → sayısal / etiket metni (platform mono)
 */
export const fonts = {
  display: 'Inter-Bold',
  semibold: 'Inter-SemiBold',
  medium: 'Inter-Medium',
  regular: 'Inter-Regular',
  mono: 'SpaceMono, ui-monospace, monospace',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
  '4xl': 40,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  pill: 999,
} as const;

export const shadow = {
  /** Ana buton gölgesi */
  primary: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  /** Kart gölgesi (hafif, modern) */
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;

export const theme = { colors, fonts, fontSize, spacing, radius, shadow } as const;

export type Theme = typeof theme;
export default theme;
