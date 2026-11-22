import { describe, it, expect } from 'vitest';
import { sign, verifySignature } from '@/lib/cc/hmac';

const now = 1_700_000_000_000;
describe('ingest signature', () => {
  const body = '{"day":"2026-01-01"}', ts = String(now);
  it('accepts a valid signature', () => { expect(verifySignature('s', ts, body, sign('s', ts, body), now)).toBe(true); });
  it('rejects wrong secret, tampered body, bad hex, replay', () => {
    expect(verifySignature('s', ts, body, sign('x', ts, body), now)).toBe(false);
    expect(verifySignature('s', ts, body + ' ', sign('s', ts, body), now)).toBe(false);
    expect(verifySignature('s', ts, body, 'zz', now)).toBe(false);
    expect(verifySignature('s', ts, body, sign('s', ts, body), now + 10 * 60_000)).toBe(false);
    expect(verifySignature('s', 'nan', body, '', now)).toBe(false);
  });
});
