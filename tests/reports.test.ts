import { describe, it, expect } from 'vitest';
import { periodFor, summarizeLedger } from '@/lib/cc/report-core';

describe('report periods', () => {
  it('daily = previous day', () => { expect(periodFor('daily', new Date('2026-03-01T06:00:00Z'))).toEqual({ start: '2026-02-28', end: '2026-02-28' }); });
  it('weekly = previous Mon-Sun', () => { expect(periodFor('weekly', new Date('2026-11-09T06:00:00Z'))).toEqual({ start: '2026-11-02', end: '2026-11-08' }); });
  it('monthly = previous calendar month', () => { expect(periodFor('monthly', new Date('2026-01-01T06:00:00Z'))).toEqual({ start: '2025-12-01', end: '2025-12-31' }); });
});

describe('ledger summary', () => {
  const rows = [
    { kind: 'revenue', status: 'received', amount: '100.00', currency: 'USD' },
    { kind: 'revenue', status: 'estimated', amount: '500.00', currency: 'USD' },
    { kind: 'revenue', status: 'failed', amount: '40.00', currency: 'USD' },
    { kind: 'refund', status: 'paid', amount: '10.00', currency: 'USD' },
    { kind: 'fee', status: 'paid', amount: '3.20', currency: 'USD' },
    { kind: 'expense', status: 'paid', amount: '20.00', currency: 'USD' },
    { kind: 'expense', status: 'pending', amount: '99.00', currency: 'USD' },
  ] as const;
  it('never counts estimated, pending or failed as received', () => {
    const f = summarizeLedger([...rows] as any).by_currency.USD;
    expect(f.gross_revenue).toBe('100.00'); expect(f.net_revenue).toBe('86.80'); expect(f.net_profit).toBe('66.80');
    expect(f.estimated_revenue_not_received).toBe('500.00'); expect(f.failed_payments).toBe(1);
  });
  it('keeps currencies separate', () => {
    const f = summarizeLedger([{ kind: 'revenue', status: 'received', amount: '1.00', currency: 'USD' }, { kind: 'revenue', status: 'received', amount: '2.00', currency: 'EUR' }] as any).by_currency;
    expect(f.USD.gross_revenue).toBe('1.00'); expect(f.EUR.gross_revenue).toBe('2.00');
  });
});
