/**
 * uuid.ts — istemci tarafı UUID v4 üretimi.
 *
 * Offline oluşturulan kayıtların stabil bir id'si olması için gerekir
 * (sunucudaki gen_random_uuid yerine). Mümkünse platformun crypto'sunu
 * kullanır; yoksa Math.random tabanlı v4'e düşer (istemci id'si için yeterli).
 */
export function uuid(): string {
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** ISO 8601 zaman damgası (now). */
export function nowIso(): string {
  return new Date().toISOString();
}
