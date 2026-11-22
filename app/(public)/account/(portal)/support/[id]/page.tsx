import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/account/session';
import PublicForm from '@/components/public-form';
import { customerReply } from '@/lib/public/actions';
export const metadata = { title: 'Support request', robots: { index: false } };
const when = (d: string) => new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb } = await requireCustomer();
  const { data: r } = await sb.from('support_requests').select('*').eq('id', id).maybeSingle();     // RLS returns nothing for another customer's request
  if (!r) notFound();
  const { data: msgs } = await sb.from('support_messages').select('id,is_staff,body,created_at').eq('request_id', id).order('created_at');
  return (
    <div className="stack">
      <div className="pgreet"><Link className="back" href="/account/support">All requests</Link><h1>{r.subject}</h1><p className="muted">{r.category} · {r.status}</p></div>
      <div className="panel">{(msgs ?? []).map((m: any) => (<div key={m.id} style={{ padding: '14px 0', borderTop: '1px solid var(--line)' }}><div className="muted" style={{ fontSize: '.85rem' }}>{m.is_staff ? 'WealthOS support' : 'You'} · {when(m.created_at)}</div><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{m.body}</p></div>))}</div>
      {r.status !== 'closed' ? <div className="panel"><h2>Reply</h2><PublicForm action={customerReply} submit="Send reply"><input type="hidden" name="request_id" value={id} /><label className="field">Message<textarea name="body" required maxLength={4000} rows={4} className="input" style={{ padding: 12, minHeight: 110 }} /></label></PublicForm></div> : <p className="muted">This request is closed. Start a new request if you need more help.</p>}
    </div>
  );
}
