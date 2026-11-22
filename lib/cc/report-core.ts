import { sumMoney, fromCents, toCents } from '@/lib/money';

export type ReportKind = 'daily' | 'weekly' | 'monthly' | 'annual';
export type LedgerRow = { kind: 'revenue' | 'refund' | 'fee' | 'expense'; status: string; amount: string; currency: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Period covered by a report generated at `anchor`: the previous full day / ISO week (Mon-Sun) / calendar month, in UTC. */
export function periodFor(kind: ReportKind, anchor: Date) {
  const a = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
  if (kind === 'daily') { const d = new Date(a.getTime() - 86400000); return { start: iso(d), end: iso(d) }; }
  if (kind === 'weekly') {
    const dow = (a.getUTCDay() + 6) % 7;                                   // Monday=0
    const thisMon = new Date(a.getTime() - dow * 86400000);
    return { start: iso(new Date(thisMon.getTime() - 7 * 86400000)), end: iso(new Date(thisMon.getTime() - 86400000)) };
  }
  if (kind === 'annual') return { start: `${a.getUTCFullYear() - 1}-01-01`, end: `${a.getUTCFullYear() - 1}-12-31` };
  const first = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1));
  const last = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 0));
  return { start: iso(first), end: iso(last) };
}

/** Separates gross, refunds, fees, expenses, net; estimated/pending/failed are reported apart and never counted as received. */
export function summarizeLedger(rows: LedgerRow[]) {
  const byCur: Record<string, any> = {};
  for (const cur of new Set(rows.map((r) => r.currency))) {
    const r = rows.filter((x) => x.currency === cur);
    const pick = (k: string, st: string[]) => r.filter((x) => x.kind === k && st.includes(x.status)).map((x) => x.amount);
    const gross = sumMoney(pick('revenue', ['received']));
    const refunds = sumMoney(pick('refund', ['received', 'paid']));
    const fees = sumMoney(pick('fee', ['received', 'paid']));
    const expenses = sumMoney(pick('expense', ['paid']));
    byCur[cur] = {
      gross_revenue: gross, refunds, fees, expenses,
      net_revenue: fromCents(toCents(gross) - toCents(refunds) - toCents(fees)),
      net_profit: fromCents(toCents(gross) - toCents(refunds) - toCents(fees) - toCents(expenses)),
      estimated_revenue_not_received: sumMoney(pick('revenue', ['estimated', 'pending'])),
      failed_payments: r.filter((x) => x.status === 'failed').length,
    };
  }
  return { available: true, by_currency: byCur };
}

export function reportToText(kind: string, p: any): string {
  const lines = [`WealthOS ${kind} report`, `Period: ${p.period.start} to ${p.period.end}`, ''];
  if (p.finance?.available) for (const [c, f] of Object.entries<any>(p.finance.by_currency))
    lines.push(`Finance (${c}): gross ${f.gross_revenue}, refunds ${f.refunds}, fees ${f.fees}, expenses ${f.expenses}, net profit ${f.net_profit}`, `  Estimated, not received: ${f.estimated_revenue_not_received}; failed payments: ${f.failed_payments}`);
  else lines.push('Finance: no ledger data for this period');
  lines.push(p.products?.available ? `Products: ${p.products.new_registrations} new registrations, ${p.products.cancellations} cancellations` : 'Products: metrics unavailable');
  lines.push(p.media?.available ? 'Media: data attached' : 'Media: analytics not connected');
  lines.push(`Operations: ${p.operations.tasks_completed} tasks completed, ${p.operations.tasks_overdue} overdue, ${p.operations.approvals_pending} approvals pending`);
  lines.push(`Open alerts: ${p.alerts.length}`);
  return lines.join('\n');
}
