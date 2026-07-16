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

/** Ücretsiz kullanıcının aynı anda sahip olabileceği fotoğraf kağıdı sayısı. */
export const FREE_PHOTO_SHEETS = 3;

const PRO_CACHE_KEY = 'is-pro-cache-v1';

/**
 * Pro (yıllık abonelik) durumu. Sunucudan okur; çevrimdışıysa son bilinen
 * değeri döner. RevenueCat webhook'u entitlements.is_pro'yu güncelleyecek.
 */
export async function getIsPro(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('is_pro, pro_until')
      .maybeSingle();
    if (error) throw error;
    const isPro =
      !!data?.is_pro &&
      (!data.pro_until || new Date(data.pro_until) > new Date());
    await AsyncStorage.setItem(PRO_CACHE_KEY, JSON.stringify(isPro));
    return isPro;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(PRO_CACHE_KEY);
      return raw ? (JSON.parse(raw) as boolean) : false;
    } catch {
      return false;
    }
  }
}

/** Listedeki fotoğraflı kağıt sayısı. */
export function countPhotoSheets(
  sheets: { image_path: string | null }[]
): number {
  return sheets.filter((s) => s.image_path != null).length;
}

/** Kalan ücretsiz fotoğraf kağıdı hakkı (Pro için Infinity). */
export function remainingPhotoSheets(
  sheets: { image_path: string | null }[],
  isPro: boolean
): number {
  return isPro
    ? Infinity
    : Math.max(0, FREE_PHOTO_SHEETS - countPhotoSheets(sheets));
}
