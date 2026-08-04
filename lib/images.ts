/**
 * images.ts — kağıt fotoğraflarının yerel kopyası + Supabase Storage senkronu.
 *
 * Kurallar:
 *  - `sheets.image_path` alanında DAİMA Storage yolu durur: `{user_id}/{sheet_id}.jpg`.
 *    (Ham `file://` URI'ler yalnızca Storage öncesi eski kayıtlarda bulunabilir; gösterimde
 *    hâlâ desteklenirler ama yeni kayıtlarda üretilmezler.)
 *  - Gösterim ÖNCE yerel dosyadan yapılır (offline-first). Yerelde yoksa imzalı URL
 *    kullanılır ve dosya, bir dahaki sefere ağ gerekmesin diye arka planda yerele indirilir.
 *  - Yükleme/silme ağ ister; bu yüzden kuyruğa alınır ve `lib/db/sync.ts` tarafından işlenir.
 *
 * Fotoğraf seçildiği anda uygulamanın kalıcı dizinine kopyalanır: ImagePicker'ın
 * döndürdüğü önbellek URI'si sistem tarafından silinebilir.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { supabase } from './supabase';

const BUCKET = 'sheets';
const DIR_NAME = 'sheets';
/** İmzalı URL ömrü (saniye). */
const SIGNED_URL_TTL = 60 * 60;

function imagesDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Kağıdın cihazdaki kalıcı dosyası (var olmak zorunda değil). */
export function localImageFile(sheetId: string): File {
  return new File(imagesDir(), `${sheetId}.jpg`);
}

/** Storage yolu: `{user_id}/{sheet_id}.jpg` */
export function storagePathFor(userId: string, sheetId: string): string {
  return `${userId}/${sheetId}.jpg`;
}

/** Storage yolu mu, yoksa cihazdan gelen ham bir URI mi? */
export function isStoragePath(value: string): boolean {
  return !value.includes('://');
}

/** Seçilen fotoğrafı kalıcı yerel konuma kopyalar ve o dosyanın URI'sini döner. */
export function persistLocalImage(sheetId: string, sourceUri: string): string {
  const target = localImageFile(sheetId);
  if (target.exists) target.delete();
  new File(sourceUri).copy(target);
  return target.uri;
}

/** Kağıdın yerel dosyasını siler (yoksa sessizce geçer). */
export function removeLocalImage(sheetId: string): void {
  const file = localImageFile(sheetId);
  if (file.exists) file.delete();
}

/**
 * Storage öncesi ham URI'li bir görseli kalıcı dizine alır.
 * Dosya artık yoksa (ör. ImagePicker önbelleği temizlenmiş) null döner.
 */
export function adoptLegacyImage(
  sheetId: string,
  rawUri: string
): string | null {
  try {
    if (!new File(rawUri).exists) return null;
    return persistLocalImage(sheetId, rawUri);
  } catch {
    return null;
  }
}

/** Tüm yerel görselleri siler — çıkış yaparken başka kullanıcıya sızmasın. */
export function removeAllLocalImages(): void {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (dir.exists) dir.delete();
}

/** Yerel dosyayı Storage'a yükler. Ağ yoksa/hata olursa false döner (kuyrukta kalır). */
export async function uploadImage(
  sheetId: string,
  storagePath: string
): Promise<boolean> {
  const file = localImageFile(sheetId);
  // Yerel dosya yoksa yükleyecek bir şey de yok; kuyruktan düşsün.
  if (!file.exists) return true;
  try {
    const bytes = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    return !error;
  } catch {
    return false;
  }
}

/** Storage'daki nesneyi siler. */
export async function removeRemoteImage(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Ekranda gösterilecek URI'yi çözer.
 *  1) Ham URI (eski kayıt) → olduğu gibi
 *  2) Yerel dosya varsa → yerel (çevrimdışı çalışır)
 *  3) Yoksa → imzalı URL, arka planda yerele indirilir
 * Hiçbiri olmazsa null (ekranlar boş kağıt gösterir).
 */
export async function resolveImageUri(
  sheetId: string,
  imagePath: string | null | undefined
): Promise<string | null> {
  if (!imagePath) return null;
  if (!isStoragePath(imagePath)) return imagePath;

  const local = localImageFile(sheetId);
  if (local.exists) return local.uri;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(imagePath, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) return null;
    // Sonraki açılışta ağ gerekmesin diye indir; başarısız olursa imzalı URL yeter.
    File.downloadFileAsync(data.signedUrl, local).catch(() => {});
    return data.signedUrl;
  } catch {
    return null;
  }
}
