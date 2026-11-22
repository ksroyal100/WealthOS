import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls, Unavailable } from '@/components/ui';
import { addPlan, deletePlan } from '@/lib/cc/actions';
import MetricsChart from '@/components/metrics-chart';
import { sumMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';
const when = (d: string | null) => (d ? new Date(d).toUTCString() : 'never');

export default async function ProductDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) notFound();
  const db = admin();
  const { data: product } = await db.from('products').select('*').eq('slug', slug).maybeSingle();
  if (!product) notFound();
  const staff = await requirePermission('products', 'view', product.id);   // product-scoped: assigned members can open their own product
  const [{ data: metrics }, { data: sources }, { data: plans }, { data: ledger }, { data: projects }, canEdit, canFinance] = await Promise.all([
    db.from('product_metrics_daily').select('*').eq('product_id', product.id).order('day', { ascending: true }).limit(120),
    db.from('data_sources').select('kind,status,last_synced_at').eq('product_id', product.id),
    db.schema('public').from('catalog_plans').select('*').eq('product_slug', slug).order('price'),
    db.from('v_monthly_financials').select('month,currency,gross_revenue,refunds,fees,net_revenue').eq('product_id', product.id).order('month', { ascending: false }).limit(6),
    db.from('projects').select('id,name,status,due_on').eq('product_id', product.id).neq('status', 'done').limit(10),
    can(staff, 'products', 'edit'), can(staff, 'finance', 'view'),
  ]);
  const rows = (metrics ?? []) as any[]; const last = rows.at(-1);
  const connected = (sources ?? []).length > 0 && (sources ?? []).every((s: any) => s.status === 'connected');
  const chart = rows.map((r) => ({ day: r.day, active_users: r.active_users, active_subscriptions: r.active_subscriptions, mrr: r.mrr == null ? null : Number(r.mrr) }));
  const stat = (k: string, v: unknown) => (<div><dt className="text-[#4A5A6A]">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v == null ? 'n/a' : String(v)}</dd></div>);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/command-center/products" className="text-sm underline">All products</Link>
      <div><h1 className="text-2xl font-semibold">{product.name}</h1><p className="text-sm text-[#4A5A6A]">{product.category ?? 'Uncategorized'} · status: {product.status}{product.app_url ? <> · <a className="underline" href={product.app_url}>Open app</a></> : null}</p></div>

      <Card title="Data source">
        <p className={connected ? 'text-sm text-[#1F7A5C]' : 'text-sm text-[#9A6410]'}>{connected ? 'Metrics connected' : 'Metrics not connected or stale'}. Last sync: {when((sources ?? [])[0]?.last_synced_at ?? null)}.</p>
      </Card>

      {last ? (
        <Card title={`Latest metrics (${last.day})`}>
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">{stat('Total users', last.total_users)}{stat('Active users', last.active_users)}{stat('New registrations', last.new_registrations)}{stat('Active subscriptions', last.active_subscriptions)}{stat('Cancellations', last.cancellations)}{stat('MRR', last.mrr == null ? null : `${last.currency ?? 'USD'} ${last.mrr}`)}{stat('Health', last.health)}</dl>
          {rows.length > 1 && <div className="mt-4 grid gap-4 md:grid-cols-2"><MetricsChart data={chart} dataKey="active_users" label="Active users over time" /><MetricsChart data={chart} dataKey="active_subscriptions" label="Active subscriptions over time" /></div>}
        </Card>) : <Card title="Metrics"><Unavailable what={`${product.name} usage metrics`} /></Card>}

      {canFinance && <Card title="Revenue, last months (received only)">
        {(ledger ?? []).length === 0 ? <Unavailable what="Revenue for this product" /> : <table className="w-full text-sm"><thead><tr className="text-left text-[#4A5A6A]"><th>Month</th><th>Gross</th><th>Refunds</th><th>Fees</th><th>Net</th></tr></thead><tbody>{(ledger ?? []).map((l: any, i: number) => <tr key={i} className="border-t"><td>{l.month}</td><td>{l.currency} {l.gross_revenue}</td><td>{l.refunds}</td><td>{l.fees}</td><td>{l.net_revenue}</td></tr>)}</tbody></table>}
      </Card>}

      <Card title="Open projects">{(projects ?? []).length === 0 ? <p className="text-sm text-[#4A5A6A]">No open projects linked to this product.</p> : <ul className="text-sm">{(projects ?? []).map((p: any) => <li key={p.id}>{p.name} ({p.status}) {p.due_on ? `due ${p.due_on}` : ''}</li>)}</ul>}</Card>

      <Card title="Public plans and pricing">
        {(plans ?? []).length === 0 ? <p className="text-sm text-[#4A5A6A]">No plans yet.</p> : <ul className="divide-y text-sm">{(plans ?? []).map((pl: any) => (
          <li key={pl.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{pl.name}</b> {pl.billing_interval === 'free' ? 'Free' : `${pl.currency} ${pl.price} / ${pl.billing_interval}`} <span className="text-[#4A5A6A]">{(pl.features ?? []).length} features</span></span>
            {canEdit && <form action={deletePlan}><input type="hidden" name="id" value={pl.id} /><input type="hidden" name="product_slug" value={slug} /><button className="text-xs text-red-700 underline">Remove</button></form>}</li>))}</ul>}
        {canEdit && <form action={addPlan} className="mt-4 grid gap-3 md:grid-cols-3"><input type="hidden" name="product_slug" value={slug} />
          <Field label="Plan name"><input required name="name" className={inputCls} /></Field><Field label="Price"><input required name="price" defaultValue="0" inputMode="decimal" className={inputCls} /></Field>
          <Field label="Billing"><select name="billing_interval" className={inputCls}><option value="free">Free</option><option value="month">Monthly</option><option value="year">Yearly</option><option value="one_time">One time</option></select></Field>
          <Field label="Currency"><input name="currency" defaultValue="USD" maxLength={3} className={inputCls} /></Field>
          <Field label="Checkout link (Stripe Payment Link, https)"><input type="url" name="checkout_url" className={inputCls} /></Field>
          <Field label="Features (one per line)"><textarea name="features" rows={3} className={inputCls} /></Field><button className={btnCls}>Add plan</button></form>}
      </Card>
    </div>
  );
}
