import { requireCustomer } from '@/lib/account/session';
import BillingButton from '@/components/billing-button';

export const metadata = { title: 'Billing and orders', robots: { index: false } };
const usd = (a: string | number | null, c: string | null) => (a == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(Number(a)));
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const tone = (s: string) => (s === 'paid' ? 'b-live' : s === 'failed' ? 'b-beta' : 'b-coming_soon');

export default async function Billing() {
  const { sb } = await requireCustomer();
  const { data: orders } = await sb.from('customer_orders').select('id,description,amount,currency,status,created_at').order('created_at', { ascending: false }).limit(100);
  return (
    <div className="stack">
      <div className="pgreet"><h1>Billing and orders</h1><p className="muted">Payments are processed securely by Stripe. WealthOS never stores your full card number.</p></div>
      <div className="panel"><h2>Payment method and invoices</h2><p className="muted" style={{ marginTop: 0 }}>Open the billing portal to update your card or download invoices.</p><BillingButton /></div>
      <div className="panel"><h2>Purchase history</h2>
        {(orders ?? []).length === 0 ? <p className="muted">No purchases yet.</p> : (orders ?? []).map((o: any) => (
          <div className="rowline" key={o.id}><span>{o.description ?? 'Payment'} <span className="muted">· {date(o.created_at)}</span></span><span>{usd(o.amount, o.currency)} <span className={`badge ${tone(o.status)}`}>{o.status}</span></span></div>))}
      </div>
    </div>
  );
}
