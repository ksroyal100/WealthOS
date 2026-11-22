import Link from 'next/link';
import { requireCustomer } from '@/lib/account/session';
import BillingButton from '@/components/billing-button';

export const metadata = { title: 'Subscriptions', robots: { index: false } };
const usd = (a: string | number | null, c: string | null) => (a == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(Number(a)));
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
const tone = (s: string) => (['active', 'trialing'].includes(s) ? 'b-live' : s === 'past_due' ? 'b-beta' : 'b-coming_soon');

export default async function Subscriptions() {
  const { sb } = await requireCustomer();
  const { data: subs } = await sb.from('customer_subscriptions').select('*').order('updated_at', { ascending: false });
  return (
    <div className="stack">
      <div className="pgreet"><h1>Subscriptions</h1><p className="muted">Your plans and when they renew.</p></div>
      {(subs ?? []).length === 0 ? (
        <div className="panel empty"><p><b>You do not have a subscription yet.</b></p><p className="muted">Pick a product and plan whenever you are ready.</p><Link href="/marketplace" className="btn solid">Explore products</Link></div>
      ) : (subs ?? []).map((s: any) => (
        <div className="panel" key={s.id}>
          <div className="rowhead"><h2>{s.plan_name ?? s.product_slug ?? 'Subscription'}</h2><span className={`badge ${tone(s.status)}`}>{s.status.replace('_', ' ')}</span></div>
          <div className="rowline"><span className="muted">Price</span><span>{usd(s.amount, s.currency)}{s.billing_interval ? ` / ${s.billing_interval}` : ''}</span></div>
          <div className="rowline"><span className="muted">{s.cancel_at_period_end ? 'Ends on' : 'Renews on'}</span><span>{date(s.current_period_end)}</span></div>
        </div>))}
      <div className="panel"><h2>Change or cancel</h2><p className="muted" style={{ marginTop: 0 }}>Update your plan, payment method or cancel in the secure billing portal.</p><BillingButton /></div>
    </div>
  );
}
