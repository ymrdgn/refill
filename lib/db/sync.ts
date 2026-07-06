/**
 * sync.ts — offline-first senkron servisi.
 *
 * Akış (online olunca): önce outbox → Supabase (push), sonra Supabase → yerel (pull).
 * Çatışma çözümü MVP'de "son-yazan-kazanır": push'tan sonra sunucu en güncel halimizi
 * içerir, ardından pull yerel veriyi sunucu gerçeğiyle değiştirir.
 *
 * Ağ hatası olursa sessizce durur ve outbox korunur (veri kaybı yok).
 */
import { supabase } from '../supabase';
import * as local from './local';
import type { OutboxEntry } from './local';

let syncing = false;

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  reason?: string;
}

/** session_rows bileşik anahtar; diğerleri id. */
function onConflictFor(table: local.TableName): string {
  return table === 'session_rows' ? 'session_id,row_id' : 'id';
}

async function applyEntry(entry: OutboxEntry): Promise<void> {
  if (entry.op === 'upsert') {
    const { error } = await supabase
      .from(entry.table)
      .upsert(entry.payload as any, { onConflict: onConflictFor(entry.table) });
    if (error) throw error;
  } else {
    // delete: payload anahtar alanlarını içerir
    let q = supabase.from(entry.table).delete();
    for (const [k, v] of Object.entries(entry.payload)) {
      q = q.eq(k, v as any);
    }
    const { error } = await q;
    if (error) throw error;
  }
}

/** Outbox'ı sırayla Supabase'e taşır. Başarılıları kuyruktan siler. */
export async function pushOutbox(): Promise<number> {
  const queue = await local.getOutbox();
  if (queue.length === 0) return 0;

  const done: string[] = [];
  for (const entry of queue) {
    try {
      await applyEntry(entry);
      done.push(entry.id);
    } catch (e) {
      // İlk hatada dur; kalanları sonraki denemede işleriz (sıra korunur).
      break;
    }
  }
  if (done.length) await local.removeFromOutbox(done);
  return done.length;
}

/** Kullanıcının tüm verisini Supabase'den çekip yereli günceller. */
export async function pullAll(userId: string): Promise<number> {
  // sheets + sessions doğrudan user_id ile
  const { data: sheets, error: e1 } = await supabase
    .from('sheets')
    .select('*')
    .eq('user_id', userId);
  if (e1) throw e1;

  const { data: sessions, error: e2 } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId);
  if (e2) throw e2;

  const sheetIds = (sheets ?? []).map((s) => s.id);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  // çocuk tablolar parent id'lerine göre
  const sheetRows = sheetIds.length
    ? (await supabase.from('sheet_rows').select('*').in('sheet_id', sheetIds))
        .data ?? []
    : [];
  const sessionRows = sessionIds.length
    ? (
        await supabase
          .from('session_rows')
          .select('*')
          .in('session_id', sessionIds)
      ).data ?? []
    : [];
  const strokes = sessionIds.length
    ? (await supabase.from('strokes').select('*').in('session_id', sessionIds))
        .data ?? []
    : [];

  // Yereli sunucu gerçeğiyle değiştir (push zaten önce çalıştı).
  await local.setAll('sheets', sheets ?? []);
  await local.setAll('sheet_rows', sheetRows as any);
  await local.setAll('sessions', sessions ?? []);
  await local.setAll('session_rows', sessionRows as any);
  await local.setAll('strokes', strokes as any);

  await local.setMeta('lastPull', new Date().toISOString());
  return (sheets?.length ?? 0) + (sessions?.length ?? 0);
}

/** Tam senkron: push sonra pull. Ağ yoksa sessizce ok:false döner. */
export async function sync(userId: string): Promise<SyncResult> {
  if (syncing) return { ok: false, pushed: 0, pulled: 0, reason: 'busy' };
  syncing = true;
  try {
    const pushed = await pushOutbox();
    // Outbox hâlâ doluysa (bir şey push edilemedi) pull'u atla.
    const remaining = (await local.getOutbox()).length;
    if (remaining > 0) {
      return { ok: false, pushed, pulled: 0, reason: 'outbox-not-drained' };
    }
    const pulled = await pullAll(userId);
    return { ok: true, pushed, pulled };
  } catch (e: any) {
    return {
      ok: false,
      pushed: 0,
      pulled: 0,
      reason: e?.message ?? 'network',
    };
  } finally {
    syncing = false;
  }
}
