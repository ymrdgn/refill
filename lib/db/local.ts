/**
 * local.ts — AsyncStorage tabanlı yerel veri deposu (offline-first).
 *
 * Her tablo, JSON dizisi olarak tek bir AsyncStorage anahtarında tutulur.
 * Küçük veri hacmi (birkaç sheet/oturum) için yeterlidir. Tüm yazmalar
 * önce buraya işlenir; senkron servisi (sync.ts) outbox'ı Supabase'e taşır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Sheet,
  SheetRow,
  Session,
  SessionRow,
  Stroke,
} from '../database.types';

const PREFIX = 'refill:v1:';

export type TableName =
  | 'sheets'
  | 'sheet_rows'
  | 'sessions'
  | 'session_rows'
  | 'strokes';

/** Outbox: senkronlanmayı bekleyen yerel değişiklikler. */
export type OutboxOp = 'upsert' | 'delete';
export interface OutboxEntry {
  id: string;
  table: TableName;
  op: OutboxOp;
  /** upsert için tam satır; delete için en azından pk alanları */
  payload: Record<string, unknown>;
  created_at: string;
}

/** Tabloların yerel satır tipleri (Supabase Row tipleriyle aynı). */
export interface LocalTables {
  sheets: Sheet;
  sheet_rows: SheetRow;
  sessions: Session;
  session_rows: SessionRow;
  strokes: Stroke;
}

const key = (name: string) => `${PREFIX}${name}`;

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key(name));
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key(name), JSON.stringify(value));
}

/** Bir tablonun tüm satırlarını getirir. */
export async function getAll<T extends TableName>(
  table: T
): Promise<LocalTables[T][]> {
  return readJson<LocalTables[T][]>(table, []);
}

/** Bir tablonun tamamını değiştirir. */
export async function setAll<T extends TableName>(
  table: T,
  rows: LocalTables[T][]
): Promise<void> {
  await writeJson(table, rows);
}

/**
 * Bir satırı verilen anahtar alanlarına göre ekler/günceller (upsert).
 * keyFields: eşleşmeyi belirleyen alanlar (ör. ['id'] veya ['session_id','row_id']).
 */
export async function upsertRow<T extends TableName>(
  table: T,
  row: LocalTables[T],
  keyFields: (keyof LocalTables[T])[]
): Promise<void> {
  const rows = await getAll(table);
  const matches = (r: LocalTables[T]) =>
    keyFields.every((f) => (r as any)[f] === (row as any)[f]);
  const idx = rows.findIndex(matches);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  await setAll(table, rows);
}

/** Anahtar alanlarına göre bir satırı siler. */
export async function deleteRow<T extends TableName>(
  table: T,
  keyValues: Partial<LocalTables[T]>
): Promise<void> {
  const rows = await getAll(table);
  const matches = (r: LocalTables[T]) =>
    (Object.keys(keyValues) as (keyof LocalTables[T])[]).every(
      (f) => (r as any)[f] === (keyValues as any)[f]
    );
  await setAll(
    table,
    rows.filter((r) => !matches(r))
  );
}

/* ------------------------------------------------------------------ */
/*  OUTBOX                                                             */
/* ------------------------------------------------------------------ */
const OUTBOX = 'outbox';

export async function getOutbox(): Promise<OutboxEntry[]> {
  return readJson<OutboxEntry[]>(OUTBOX, []);
}

export async function enqueue(entry: OutboxEntry): Promise<void> {
  const q = await getOutbox();
  q.push(entry);
  await writeJson(OUTBOX, q);
}

export async function removeFromOutbox(ids: string[]): Promise<void> {
  const set = new Set(ids);
  const q = await getOutbox();
  await writeJson(
    OUTBOX,
    q.filter((e) => !set.has(e.id))
  );
}

/* ------------------------------------------------------------------ */
/*  SENKRON META (son pull zamanı vb.)                                */
/* ------------------------------------------------------------------ */
export async function getMeta(name: string): Promise<string | null> {
  return AsyncStorage.getItem(key(`meta:${name}`));
}
export async function setMeta(name: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key(`meta:${name}`), value);
}

/** Tüm yerel veriyi temizler (çıkış yaparken). */
export async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(PREFIX));
  if (mine.length) await AsyncStorage.multiRemove(mine);
}
