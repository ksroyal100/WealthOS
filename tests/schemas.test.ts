import { describe, it, expect } from 'vitest';
import { metricsPayload, ledgerEntry } from '@/lib/cc/schemas';

describe('input validation', () => {
  it('metrics reject unknown keys and negatives', () => {
    expect(metricsPayload.safeParse({ day: '2026-01-01', evil: 1 }).success).toBe(false);
    expect(metricsPayload.safeParse({ day: '2026-01-01', total_users: -1 }).success).toBe(false);
    expect(metricsPayload.safeParse({ day: '2026-01-01', mrr: '10.50' }).success).toBe(true);
  });
  it('ledger amounts must be positive decimal strings', () => {
    const base = { occurred_on: '2026-01-01', kind: 'expense', category: 'x', status: 'paid', currency: 'USD' };
    expect(ledgerEntry.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(ledgerEntry.safeParse({ ...base, amount: '-5' }).success).toBe(false);
    expect(ledgerEntry.safeParse({ ...base, amount: '5.123' }).success).toBe(false);
    expect(ledgerEntry.safeParse({ ...base, amount: '5.12' }).success).toBe(true);
  });
});
