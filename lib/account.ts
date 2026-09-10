/**
 * account.ts — hesap silme.
 *
 * Sıra önemli:
 *  1) Storage: kullanıcının klasöründeki fotoğraflar Storage API ile silinir
 *     (SQL'den storage.objects silmek dosyayı depodan kaldırmaz).
 *  2) Sunucu: delete_my_account() RPC'si auth.users satırını siler; tüm
 *     tablolar cascade ile boşalır (bkz. supabase/schema_account.sql).
 *  3) Yerel: oturum, veri ve görseller temizlenir.
 *
 * Abonelik silinmez; kullanıcı mağaza ayarlarından ayrıca iptal etmeli
 * (metin uyarıda ve account-deletion.html'de söylenir).
 */
import { supabase } from './supabase';
import { clearAll } from './db/local';
import { removeAllLocalImages } from './images';

const BUCKET = 'sheets';

export async function deleteAccount(userId: string): Promise<void> {
  // 1) Storage — RLS yalnızca kendi klasörüne izin verir.
  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(userId, { limit: 1000 });
  if (listErr) throw listErr;
  if (files && files.length > 0) {
    const { error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (rmErr) throw rmErr;
  }

  // 2) Sunucu — bu adımdan sonra hesap yok.
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;

  // 3) Yerel — oturum zaten geçersiz, signOut hata verse de devam.
  await supabase.auth.signOut().catch(() => {});
  await clearAll();
  removeAllLocalImages();
}
