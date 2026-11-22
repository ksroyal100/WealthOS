import Link from 'next/link';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Unavailable } from '@/components/ui';
import { resolveAlert } from '@/lib/cc/actions';
import { summarizeLedger } from '@/lib/cc/report-core';
import { companyKpis, monthOverMonth } from '@/lib/cc/kpis';
import MetricsChart from '@/components/metrics-chart';

export const dynamic = 'force-dynamic';
const when = (d: string | null) => (d ? new Date(d).toUTCString() : 'never');
const pct = (n: number | null) => (n == null ? 'n/a' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);
const kv = (o: Record<string, string> | null) => (o ? Object.entries(o).map(([c, v]) => `${c} ${v}`).join(' · ') : null);

export default async function Overview() {
  const staff = await requirePermission('dashboard', 'view');
  const db = admin();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const in14 = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const [seeFinance, seeSecurity, seeAudit] = await Promise.all([can(staff, 'finance', 'view'), can(staff, 'security', 'view'), can(staff, 'audit', 'view')]);

  const [products, sources, metrics, alerts, overdue, open, approvals, ledger, monthly, deadlines, projectsActive, done30, activity] = await Promise.all([
    db.from('products').select('id,slug,name,status'),
    db.from('data_sources').select('product_id,kind,status,last_synced_at'),
    db.from('product_metrics_daily').select('product_id,day,active_users,active_subscriptions,new_registrations,cancellations,mrr,currency,total_users,health').order('day', { ascending: true }).limit(3000),
    db.from('alerts').select('id,severity,kind,message,created_at').is('resolved_at', null).order('created_at', { ascending: false }).limit(10),
    db.from('tasks').select('id', { count: 'exact', head: true }).lt('due_on', today).neq('status', 'done'),
    db.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'done'),
    db.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    seeFinance ? db.from('ledger_entries').select('kind,status,amount,currency').gte('occurred_on', monthStart) : Promise.resolve({ data: null }),
    seeFinance ? db.from('v_monthly_financials').select('month,currency,net_revenue').order('month', { ascending: false }).limit(120) : Promise.resolve({ data: null }),
    db.from('tasks').select('id,title,due_on,status,projects(name)').neq('status', 'done').gte('due_on', today).lte('due_on', in14).order('due_on').limit(8),
    db.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done').gte('completed_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
    seeAudit ? db.from('audit_log').select('at,actor_id,action,resource,outcome').order('id', { ascending: false }).limit(8) : Promise.resolve({ data: null }),
  ]);
  const fin = ledger.data?.length ? summarizeLedger(ledger.data as any) : null;
  const k = companyKpis((metrics.data ?? []) as any, today);
  const mom = monthly.data ? monthOverMonth(monthly.data as any, monthStart) : null;
  let names: Record<string, string> = {};
  if (activity.data?.length) {
    const ids = [...new Set((activity.data as any[]).map((a) => a.actor_id).filter(Boolean))];
    if (ids.length) { const { data } = await db.from('staff_members').select('user_id,full_name').in('user_id', ids); names = Object.fromEntries((data ?? []).map((s: any) => [s.user_id, s.full_name])); }
  }
  const stat = (label: string, value: string | number | null) => (<div><dt className="text-[#4A5A6A]">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value ?? 'n/a'}</dd></div>);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Good to see you, {staff.fullName.split(' ')[0]}</h1>
        <p className="mt-1 max-w-prose text-sm text-[#4A5A6A]">Figures appear only when a verified source reports. Anything unavailable shows as n/a or not connected, never as zero.</p>
      </div>

      {seeFinance && (
        <Card title="Finance this month (received money only)">
          {fin ? Object.entries<any>(fin.by_currency).map(([cur, f]) => (
            <dl key={cur} className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              {[['Gross revenue', f.gross_revenue], ['Refunds', f.refunds], ['Fees', f.fees], ['Expenses', f.expenses], ['Net profit', f.net_profit]].map(([l, v]) => stat(l, `${cur} ${v}`))}
              <div className="col-span-full text-xs text-[#4A5A6A]">Estimated, not yet received: {cur} {f.estimated_revenue_not_received}. Failed payments: {f.failed_payments}.</div>
            </dl>)) : <Unavailable what="Ledger data for this month" />}
          {mom && <p className="mt-3 text-sm">Net revenue, last full month vs the month before: {Object.entries(mom).map(([c, m]) => `${c} ${m.latest} vs ${m.previous} (${pct(m.pct)})`).join(' · ')}</p>}
        </Card>)}

      <Card title="Growth (from product-reported metrics)">
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {stat('Monthly recurring revenue', kv(k.mrr))}{stat('Annualized (MRR x 12)', kv(k.arr))}{stat('Active users', k.activeUsers)}{stat('Active subscriptions', k.activeSubs)}
          {stat('New registrations (30 days)', k.newRegs)}{stat('Subscription growth (30 days)', pct(k.subscriptionGrowthPct))}{stat('Churn (30 days)', k.churnPct == null ? 'n/a' : `${k.churnPct.toFixed(1)}%`)}
        </dl>
        {k.mrr == null && <p className="mt-3 text-sm text-[#9A6410]">No product has reported MRR yet. Connect Finora metrics to see growth figures.</p>}
      </Card>

      <Card title="Products">
        <ul className="divide-y divide-[#EEF1F4]">
          {(products.data ?? []).map((p: any) => {
            const src = (sources.data ?? []).filter((s: any) => s.product_id === p.id);
            const ok = src.length > 0 && src.every((s: any) => s.status === 'connected');
            const series = (metrics.data ?? []).filter((m: any) => m.product_id === p.id);
            const last: any = series.at(-1);
            return (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><Link href={`/command-center/products/${p.slug}`} className="font-medium underline">{p.name}</Link><div className="text-xs text-[#4A5A6A]">Status: {p.status}</div></div>
                  <div className="text-right text-sm"><span className={ok ? 'text-[#1F7A5C]' : 'text-[#9A6410]'}>{ok ? 'Metrics connected' : 'Metrics not connected or stale'}</span><div className="text-xs text-[#4A5A6A]">Last sync: {when(src[0]?.last_synced_at ?? null)}</div></div>
                </div>
                {last && <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-5"><span>Users: {last.total_users ?? 'n/a'}</span><span>Active: {last.active_users ?? 'n/a'}</span><span>New: {last.new_registrations ?? 'n/a'}</span><span>Subscriptions: {last.active_subscriptions ?? 'n/a'}</span><span>Health: {last.health ?? 'n/a'}</span></div>}
                {series.length > 1 && <MetricsChart data={series as any} dataKey="active_users" label={`${p.name} active users over time`} />}
              </li>);
          })}
        </ul>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Operations">
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">{stat('Projects in progress', projectsActive.count ?? 0)}{stat('Tasks completed (30 days)', done30.count ?? 0)}{stat('Open tasks', open.count ?? 0)}{stat('Overdue', overdue.count ?? 0)}{stat('Pending approvals', approvals.count ?? 0)}</dl>
          <h3 className="mt-4 text-sm font-medium text-[#4A5A6A]">Upcoming deadlines (14 days)</h3>
          {(deadlines.data ?? []).length === 0 ? <p className="text-sm text-[#4A5A6A]">Nothing due soon.</p> : <ul className="mt-1 text-sm">{(deadlines.data ?? []).map((t: any) => <li key={t.id}>{t.due_on}: {t.title} <span className="text-[#4A5A6A]">({t.projects?.name})</span></li>)}</ul>}
          <Link className="mt-3 inline-block text-sm underline" href="/command-center/projects">Open projects</Link>
        </Card>
        <Card title="Alerts">
          {(alerts.data ?? []).length === 0 ? <p className="text-sm text-[#4A5A6A]">No open alerts.</p> : (
            <ul className="space-y-2 text-sm">{(alerts.data ?? []).map((a: any) => (
              <li key={a.id} className="flex items-start justify-between gap-3"><span><b className={a.severity === 'critical' ? 'text-red-700' : ''}>{a.severity}</b>: {a.message}</span>{seeSecurity && <form action={resolveAlert}><input type="hidden" name="id" value={a.id} /><button className="text-xs underline">Resolve</button></form>}</li>))}</ul>)}
        </Card>
      </div>

      {activity.data && (
        <Card title="Team activity"><ul className="text-sm">{(activity.data as any[]).map((a, i) => <li key={i}>{new Date(a.at).toUTCString()}: {names[a.actor_id] ?? 'system'} {a.action} {a.resource} ({a.outcome})</li>)}</ul></Card>)}
    </div>
  );
}
