import Link from 'next/link';
import { requireCustomer } from '@/lib/account/session';
export const metadata = { title: 'Support requests', robots: { index: false } };
const date = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function SupportList() {
  const { sb } = await requireCustomer();
  const { data } = await sb.from('support_requests').select('id,subject,category,status,updated_at').order('updated_at', { ascending: false }).limit(100);   // RLS: only this customer's requests
  return (
    <div className="stack">
      <div className="pgreet"><h1>Support requests</h1><p className="muted">Questions about your account, billing or products.</p><Link className="btn solid small" href="/account/support/new">New request</Link></div>
      {(data ?? []).length === 0 ? <div className="panel empty"><p><b>No support requests yet.</b></p><p className="muted">Browse the <Link className="back" href="/support">help center</Link> or send us a request.</p></div> : (
        <div className="panel">{(data ?? []).map((r: any) => (<div className="rowline" key={r.id}><span><Link className="back" href={`/account/support/${r.id}`}>{r.subject}</Link> <span className="muted">· {r.category} · {date(r.updated_at)}</span></span><span className={`badge ${r.status === 'closed' ? 'b-coming_soon' : r.status === 'pending' ? 'b-beta' : 'b-live'}`}>{r.status}</span></div>))}</div>)}
    </div>
  );
}
