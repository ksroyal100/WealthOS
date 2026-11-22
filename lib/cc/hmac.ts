import { createHmac, timingSafeEqual } from 'crypto';

/** Signature = HMAC-SHA256(secret, `${timestamp}.${rawBody}`) hex. Rejects stale timestamps (replay). */
export function verifySignature(secret: string, timestamp: string, rawBody: string, signature: string, now = Date.now(), toleranceMs = 5 * 60_000) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceMs) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  let given: Buffer;
  try { given = Buffer.from(signature, 'hex'); } catch { return false; }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
export const sign = (secret: string, timestamp: string, rawBody: string) =>
  createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
