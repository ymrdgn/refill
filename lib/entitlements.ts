/**
 * entitlements.ts — freemium hakları (istemci tarafı).
 *
 * Model: ücretsiz kullanıcı aynı anda en fazla FREE_PHOTO_SHEETS adet
 * fotoğraflı kağıda sahip olabilir; kağıt silinirse hak geri gelir.
 * Kota gerçek zamanlı olarak YEREL kağıt listesinden hesaplanır (offline
 * doğru, cache yarışı yok). Sunucu tarafında aynı kural sheets trigger'ı
 * ile uygulanır (istemci atlatılamaz). Pro durumu sunucudan okunur ve
 * çevrimdışı için önbelleğe alınır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isPlanActive, listMyOrgs } from './orgs';

/** Ücretsiz kullanıcının aynı anda sahip olabileceği fotoğraf kağıdı sayısı. */
export const FREE_PHOTO_SHEETS = 3;

const CACHE_KEY = 'entitlement-cache-v2';

export type PlanKind = 'individual' | 'family';

export interface Entitlement {
  /** Abonelik şu an geçerli mi (is_pro + pro_until). */
  isPro: boolean;
  /** Geçerli aboneliğin paketi; abonelik yoksa null. */
  plan: PlanKind | null;
}

const NONE: Entitlement = { isPro: false, plan: null };

/**
 * Kullanıcının kendi aboneliği. Sunucudan okur; çevrimdışıysa son bilinen
 * değeri döner. RevenueCat webhook'u entitlements.is_pro/pro_until/plan
 * alanlarını güncelleyecek; aile planı da yalnızca buradan türetilir.
 */
export async function getEntitlement(): Promise<Entitlement> {
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('is_pro, pro_until, plan')
      .maybeSingle();
    if (error) throw error;
    const isPro =
      !!data?.is_pro &&
      (!data.pro_until || new Date(data.pro_until) > new Date());
    const ent: Entitlement = { isPro, plan: isPro ? (data?.plan ?? null) : null };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(ent));
    return ent;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as Entitlement) : NONE;
    } catch {
      return NONE;
    }
  }
}

/** Kısayol: abonelik geçerli mi? */
export async function getIsPro(): Promise<boolean> {
  return (await getEntitlement()).isPro;
}

/**
 * Kotaya sayılan fotoğraflı kağıt sayısı.
 * Kuruma (aile/işletme) ait kağıtlar KİŞİSEL kotaya girmez — sunucudaki
 * consume_photo_quota trigger'ı da aynı kuralı uygular.
 */
export function countPhotoSheets(
  sheets: { image_path: string | null; org_id?: string | null }[]
): number {
  return sheets.filter((s) => s.image_path != null && !s.org_id).length;
}

/** Kalan ücretsiz fotoğraf kağıdı hakkı (sınırsız hak varsa Infinity). */
export function remainingPhotoSheets(
  sheets: { image_path: string | null; org_id?: string | null }[],
  unlimited: boolean
): number {
  return unlimited
    ? Infinity
    : Math.max(0, FREE_PHOTO_SHEETS - countPhotoSheets(sheets));
}

/**
 * Sınırsız kağıt hakkı: kişisel Pro **ya da** aktif planlı bir kurumun üyesi.
 * Sunucudaki has_unlimited_sheets() ile aynı kuralı istemcide yansıtır.
 */
export async function hasUnlimitedSheets(userId: string): Promise<boolean> {
  if (await getIsPro()) return true;
  const orgs = await listMyOrgs(userId);
  return orgs.some(isPlanActive);
}
