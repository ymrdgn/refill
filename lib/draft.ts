/**
 * draft.ts — devam eden "yeni kağıt" taslağını ekranlar arası taşır.
 *
 * Foto (data/blob URI) router parametresine sığmayacağı için bellek-içi
 * basit bir singleton kullanılır. Yalnızca oturum boyunca geçerlidir.
 */
export interface SheetDraft {
  imageUri: string | null;
  name: string;
}

let current: SheetDraft | null = null;

export function setSheetDraft(d: SheetDraft) {
  current = d;
}
export function getSheetDraft(): SheetDraft | null {
  return current;
}
export function clearSheetDraft() {
  current = null;
}
