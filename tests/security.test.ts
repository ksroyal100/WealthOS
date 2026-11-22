import { describe, it, expect } from 'vitest';
import { sameOrigin } from '@/lib/cc/csrf';
import { bump, rateLimit } from '@/lib/rate-limit';
import { companyKpis, monthOverMonth } from '@/lib/cc/kpis';

const req = (h: Record<string, string>) => new Request('https://app.test/x', { method: 'POST', headers: h });
describe('csrf same-origin', () => {
  it('allows same origin', () => expect(sameOrigin(req({ origin: 'https://app.test', host: 'app.test' }))).toBe(true));
  it('blocks cross-site and missing origin', () => { expect(sameOrigin(req({ origin: 'https://evil.test', host: 'app.test' }))).toBe(false); expect(sameOrigin(req({ host: 'app.test' }))).toBe(false); expect(sameOrigin(req({ origin: 'nope', host: 'app.test' }))).toBe(false); });
});
describe('rate limiting', () => {
  it('limits after max', () => { const k = 'k' + Math.random(); expect([1, 2, 3, 4].map(() => rateLimit(k, 3, 1000))).toEqual([true, true, true, false]); });
  it('counts failures', () => { const k = 'f' + Math.random(); expect(bump(k, 1000)).toBe(1); expect(bump(k, 1000)).toBe(2); });
});
describe('kpis never invent numbers', () => {
  it('returns nulls without data', () => { const k = companyKpis([], '2026-03-31'); expect(k.mrr).toBeNull(); expect(k.churnPct).toBeNull(); expect(k.activeUsers).toBeNull(); });
  it('computes MRR, ARR, growth and churn from real rows', () => {
    const rows = [
      { product_id: 'a', day: '2026-02-28', active_users: 90, active_subscriptions: 100, new_registrations: 5, cancellations: 2, mrr: '1000.00', currency: 'USD' },
      { product_id: 'a', day: '2026-03-30', active_users: 120, active_subscriptions: 110, new_registrations: 10, cancellations: 4, mrr: '1250.50', currency: 'USD' },
    ];
    const k = companyKpis(rows, '2026-03-31');
    expect(k.mrr).toEqual({ USD: '1250.50' }); expect(k.arr).toEqual({ USD: '15006.00' });
    expect(k.subscriptionGrowthPct).toBeCloseTo(10); expect(k.churnPct).toBeCloseTo(4); expect(k.activeUsers).toBe(120);
  });
  it('month over month uses complete months only', () => {
    const r = [{ month: '2026-03-01', currency: 'USD', net_revenue: '999.00' }, { month: '2026-02-01', currency: 'USD', net_revenue: '200.00' }, { month: '2026-01-01', currency: 'USD', net_revenue: '100.00' }];
    expect(monthOverMonth(r, '2026-03-01')).toEqual({ USD: { latest: '200.00', previous: '100.00', pct: 100 } });
    expect(monthOverMonth([r[0]], '2026-03-01')).toBeNull();
  });
});
