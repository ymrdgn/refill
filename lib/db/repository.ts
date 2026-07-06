/**
 * repository.ts — uygulama veri işlemleri (offline-first).
 *
 * Tüm okuma/yazma ÖNCE yerelde (local.ts) gerçekleşir. Her yazma, Supabase'e
 * taşınmak üzere outbox'a bir iş kaydı bırakır (sync.ts işler). Ekranlar yalnızca
 * bu modülü kullanır; doğrudan Supabase'e ya da AsyncStorage'a dokunmaz.
 */
import { uuid, nowIso } from '../uuid';
import type {
  Sheet,
  SheetRow,
  Session,
  SessionRow,
  Stroke,
  StrokePoint,
} from '../database.types';
import * as local from './local';

/* ------------------------------------------------------------------ */
/*  Outbox yardımcıları                                               */
/* ------------------------------------------------------------------ */
function enqueueUpsert(
  table: local.TableName,
  payload: Record<string, unknown>
) {
  return local.enqueue({
    id: uuid(),
    table,
    op: 'upsert',
    payload,
    created_at: nowIso(),
  });
}
function enqueueDelete(
  table: local.TableName,
  payload: Record<string, unknown>
) {
  return local.enqueue({
    id: uuid(),
    table,
    op: 'delete',
    payload,
    created_at: nowIso(),
  });
}

/* ================================================================== */
/*  SHEETS                                                            */
/* ================================================================== */
export interface SheetSummary extends Sheet {
  rowCount: number;
  sessionCount: number;
}

export async function listSheets(userId: string): Promise<SheetSummary[]> {
  const [sheets, rows, sessions] = await Promise.all([
    local.getAll('sheets'),
    local.getAll('sheet_rows'),
    local.getAll('sessions'),
  ]);
  return sheets
    .filter((s) => s.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((s) => ({
      ...s,
      rowCount: rows.filter((r) => r.sheet_id === s.id).length,
      sessionCount: sessions.filter((se) => se.sheet_id === s.id).length,
    }));
}

export async function getSheet(id: string): Promise<Sheet | null> {
  const sheets = await local.getAll('sheets');
  return sheets.find((s) => s.id === id) ?? null;
}

export async function getSheetRows(sheetId: string): Promise<SheetRow[]> {
  const rows = await local.getAll('sheet_rows');
  return rows
    .filter((r) => r.sheet_id === sheetId)
    .sort((a, b) => a.idx - b.idx || a.y - b.y);
}

/**
 * Bir kağıdı (foto + satırlar) oluşturur ya da günceller.
 * rows: satırların tam listesi — mevcut satırlarla diff'lenip
 * eklenen/güncellenen upsert, kaldırılan delete olarak kuyruğa girer.
 */
export async function saveSheet(input: {
  id?: string;
  userId: string;
  name: string;
  imagePath: string | null;
  rows: { id?: string; y: number; label: string }[];
}): Promise<Sheet> {
  const now = nowIso();
  const existing = input.id ? await getSheet(input.id) : null;

  const sheet: Sheet = {
    id: input.id ?? uuid(),
    user_id: input.userId,
    name: input.name || 'İsimsiz kağıt',
    image_path: input.imagePath,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await local.upsertRow('sheets', sheet, ['id']);
  await enqueueUpsert('sheets', sheet);

  // Satırları diff'le
  const prevRows = await getSheetRows(sheet.id);
  const nextRows: SheetRow[] = input.rows.map((r, i) => ({
    id: r.id ?? uuid(),
    sheet_id: sheet.id,
    idx: i,
    y: r.y,
    label: r.label ?? '',
  }));
  const nextIds = new Set(nextRows.map((r) => r.id));

  // eklenen/güncellenen
  for (const r of nextRows) {
    await local.upsertRow('sheet_rows', r, ['id']);
    await enqueueUpsert('sheet_rows', r);
  }
  // silinen
  for (const r of prevRows) {
    if (!nextIds.has(r.id)) {
      await local.deleteRow('sheet_rows', { id: r.id });
      await enqueueDelete('sheet_rows', { id: r.id });
    }
  }
  return sheet;
}

export async function deleteSheet(id: string): Promise<void> {
  // Yerelde cascade: satırlar, oturumlar, session_rows, strokes
  const [rows, sessions] = await Promise.all([
    local.getAll('sheet_rows'),
    local.getAll('sessions'),
  ]);
  for (const r of rows.filter((r) => r.sheet_id === id)) {
    await local.deleteRow('sheet_rows', { id: r.id });
  }
  for (const se of sessions.filter((s) => s.sheet_id === id)) {
    await deleteSessionLocalCascade(se.id);
  }
  await local.deleteRow('sheets', { id });
  // Sunucuda ON DELETE CASCADE hallediyor; tek delete yeterli.
  await enqueueDelete('sheets', { id });
}

/* ================================================================== */
/*  SESSIONS                                                          */
/* ================================================================== */
export interface SessionDetail {
  session: Session;
  values: Record<string, string>; // rowId -> value
  strokes: Stroke[];
}

export async function listSessions(sheetId: string): Promise<Session[]> {
  const sessions = await local.getAll('sessions');
  return sessions
    .filter((s) => s.sheet_id === sheetId)
    .sort((a, b) => (a.played_at < b.played_at ? 1 : -1));
}

export interface SessionSummary extends Session {
  strokeCount: number;
}

/** Bir kağıdın oturumları + her birinin kalem izi sayısı (geçmiş listesi için). */
export async function listSessionSummaries(
  sheetId: string
): Promise<SessionSummary[]> {
  const [sessions, strokes] = await Promise.all([
    listSessions(sheetId),
    local.getAll('strokes'),
  ]);
  return sessions.map((s) => ({
    ...s,
    strokeCount: strokes.filter((st) => st.session_id === s.id).length,
  }));
}

export async function getSessionDetail(
  sessionId: string
): Promise<SessionDetail | null> {
  const [sessions, sessionRows, strokes] = await Promise.all([
    local.getAll('sessions'),
    local.getAll('session_rows'),
    local.getAll('strokes'),
  ]);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const values: Record<string, string> = {};
  for (const sr of sessionRows.filter((r) => r.session_id === sessionId)) {
    values[sr.row_id] = sr.value;
  }
  return {
    session,
    values,
    strokes: strokes.filter((st) => st.session_id === sessionId),
  };
}

/**
 * Bir oyunu kaydeder: session + her satırın değeri (session_rows) + strokes.
 * Tek çağrıda tüm oyun yazılır (play ekranı save akışı).
 */
export async function saveSession(input: {
  id?: string;
  sheetId: string;
  userId: string;
  name: string;
  playedAt?: string;
  values: Record<string, string>;
  strokes: { rowId: string | null; points: StrokePoint[] }[];
}): Promise<Session> {
  const now = nowIso();
  const existing = input.id
    ? (await local.getAll('sessions')).find((s) => s.id === input.id)
    : null;

  const session: Session = {
    id: input.id ?? uuid(),
    sheet_id: input.sheetId,
    user_id: input.userId,
    name: input.name || 'Oyun',
    played_at: input.playedAt ?? existing?.played_at ?? now,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await local.upsertRow('sessions', session, ['id']);
  await enqueueUpsert('sessions', session);

  // session_rows (değerler) — tam yeniden yaz
  const prevRows = (await local.getAll('session_rows')).filter(
    (r) => r.session_id === session.id
  );
  const nextRowIds = new Set(Object.keys(input.values));
  for (const [rowId, value] of Object.entries(input.values)) {
    const sr: SessionRow = { session_id: session.id, row_id: rowId, value };
    await local.upsertRow('session_rows', sr, ['session_id', 'row_id']);
    await enqueueUpsert('session_rows', sr);
  }
  for (const pr of prevRows) {
    if (!nextRowIds.has(pr.row_id)) {
      await local.deleteRow('session_rows', {
        session_id: pr.session_id,
        row_id: pr.row_id,
      });
      await enqueueDelete('session_rows', {
        session_id: pr.session_id,
        row_id: pr.row_id,
      });
    }
  }

  // strokes — tam yeniden yaz (eski sil, yeni ekle)
  const prevStrokes = (await local.getAll('strokes')).filter(
    (s) => s.session_id === session.id
  );
  for (const ps of prevStrokes) {
    await local.deleteRow('strokes', { id: ps.id });
    await enqueueDelete('strokes', { id: ps.id });
  }
  for (const s of input.strokes) {
    const stroke: Stroke = {
      id: uuid(),
      session_id: session.id,
      row_id: s.rowId,
      points: s.points,
    };
    await local.upsertRow('strokes', stroke, ['id']);
    await enqueueUpsert('strokes', stroke);
  }

  return session;
}

async function deleteSessionLocalCascade(sessionId: string): Promise<void> {
  const [sessionRows, strokes] = await Promise.all([
    local.getAll('session_rows'),
    local.getAll('strokes'),
  ]);
  for (const sr of sessionRows.filter((r) => r.session_id === sessionId)) {
    await local.deleteRow('session_rows', {
      session_id: sr.session_id,
      row_id: sr.row_id,
    });
  }
  for (const st of strokes.filter((s) => s.session_id === sessionId)) {
    await local.deleteRow('strokes', { id: st.id });
  }
  await local.deleteRow('sessions', { id: sessionId });
}

export async function deleteSession(id: string): Promise<void> {
  await deleteSessionLocalCascade(id);
  // Sunucuda cascade var; tek delete yeterli.
  await enqueueDelete('sessions', { id });
}
