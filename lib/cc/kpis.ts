import { sumMoney, toCents, fromCents } from '@/lib/money';

export type MetricRow = { product_id: string; day: string; active_users: number | null; active_subscriptions: number | null; new_registrations: number | null; cancellations: number | null; mrr: string | null; currency: string | null };
const daysAgo = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() - n * 86400_000).toISOString().slice(0, 10);

/** Company KPIs from verified product metric rows. Anything that cannot be computed from real data is null, never zero. */
export function companyKpis(rows: MetricRow[], today: string) {
  const byProduct = new Map<string, MetricRow[]>();
  for (const r of rows) (byProduct.get(r.product_id) ?? byProduct.set(r.product_id, []).get(r.product_id)!).push(r);
  const mrr: Record<string, string[]> = {};
  let activeUsers: number | null = null, activeSubs: number | null = null, newRegs: number | null = null;
  let subsNow = 0, subsThen = 0, cancels = 0, haveGrowth = false;
  const since30 = daysAgo(today, 30);
  for (const list of byProduct.values()) {
    list.sort((a, b) => a.day.localeCompare(b.day));
    const L = list.at(-1)!;
    if (L.mrr != null) (mrr[L.currency ?? 'USD'] ??= []).push(L.mrr);
    if (L.active_users != null) activeUsers = (activeUsers ?? 0) + L.active_users;
    if (L.active_subscriptions != null) activeSubs = (activeSubs ?? 0) + L.active_subscriptions;
    const recent = list.filter((r) => r.day >= since30);
    if (recent.some((r) => r.new_registrations != null)) newRegs = (newRegs ?? 0) + recent.reduce((s, r) => s + (r.new_registrations ?? 0), 0);
    const E = [...list].reverse().find((r) => r.day <= daysAgo(L.day, 30));
    if (E && E.active_subscriptions != null && L.active_subscriptions != null) {
      haveGrowth = true; subsNow += L.active_subscriptions; subsThen += E.active_subscriptions;
      cancels += recent.reduce((s, r) => s + (r.cancellations ?? 0), 0);
    }
  }
  const mrrByCur = Object.fromEntries(Object.entries(mrr).map(([c, v]) => [c, sumMoney(v)]));
  const arrByCur = Object.fromEntries(Object.entries(mrrByCur).map(([c, v]) => [c, fromCents(toCents(v) * 12n)]));
  return {
    mrr: Object.keys(mrrByCur).length ? mrrByCur : null,
    arr: Object.keys(arrByCur).length ? arrByCur : null,
    activeUsers, activeSubs, newRegs,
    subscriptionGrowthPct: haveGrowth && subsThen > 0 ? ((subsNow - subsThen) / subsThen) * 100 : null,
    churnPct: haveGrowth && subsThen > 0 ? (cancels / subsThen) * 100 : null,
  };
}

/** Net revenue change between the two most recent COMPLETE months (per currency). */
export function monthOverMonth(rows: { month: string; currency: string; net_revenue: string }[], currentMonthStart: string) {
  const agg: Record<string, Record<string, string[]>> = {};
  for (const r of rows) if (r.month < currentMonthStart) ((agg[r.currency] ??= {})[r.month] ??= []).push(r.net_revenue);
  const out: Record<string, { latest: string; previous: string; pct: number | null }> = {};
  for (const [cur, months] of Object.entries(agg)) {
    const keys = Object.keys(months).sort().reverse(); if (keys.length < 2) continue;
    const latest = sumMoney(months[keys[0]]), previous = sumMoney(months[keys[1]]);
    out[cur] = { latest, previous, pct: toCents(previous) > 0n ? ((Number(toCents(latest)) - Number(toCents(previous))) / Number(toCents(previous))) * 100 : null };
  }
  return Object.keys(out).length ? out : null;
}
