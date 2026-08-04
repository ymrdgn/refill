/**
 * useSheetImage — bir kağıdın gösterilecek görsel URI'sini çözer.
 *
 * `sheets.image_path` artık Storage yolu tuttuğu için ekranlar onu doğrudan
 * <Image> içine veremez. Bu hook önce yerel dosyaya, yoksa imzalı URL'e düşer
 * (bkz. lib/images.ts). Henüz kaydedilmemiş taslakta ham URI verilirse onu
 * olduğu gibi döner.
 */
import { useEffect, useState } from 'react';
import { resolveImageUri } from '@/lib/images';

export function useSheetImage(
  sheetId: string | null | undefined,
  imagePath: string | null | undefined
): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!sheetId || !imagePath) {
      setUri(null);
      return;
    }
    resolveImageUri(sheetId, imagePath).then((u) => {
      if (alive) setUri(u);
    });
    return () => {
      alive = false;
    };
  }, [sheetId, imagePath]);

  return uri;
}
