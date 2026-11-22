import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, F, inp, fmtDateTime } from '@/components/cc/kit';
import { staffReply } from '@/lib/cc/actions-support';

export const metadata = { title: 'Support request' };

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requirePermission('support', 'view'); const pub = admin().schema('public');
  const { data: r } = await pub.from('support_requests').select('*').eq('id', id).maybeSingle();
  if (!r) notFound();
  const [{ data: msgs }, canEdit, u] = await Promise.all([pub.from('support_messages').select('*').eq('request_id', id).order('created_at'), can(staff, 'support', 'edit'), admin().auth.admin.getUserById(r.user_id)]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/command-center/support" className="text-sm underline">All requests</Link>
      <PageHeader title={r.subject} desc={`${r.category} · from ${u.data.user?.email ?? 'a customer'} · opened ${fmtDateTime(r.created_at)}`} actions={<Pill tone={toneFor(r.status)}>{r.status}</Pill>} />
      <Section title="Conversation"><ul className="space-y-3">{(msgs ?? []).map((m: any) => (<li key={m.id} className={`rounded-lg p-3 text-sm ${m.is_staff ? 'bg-emerald-50' : 'bg-slate-100'}`}><div className="mb-1 text-xs font-medium text-slate-600">{m.is_staff ? 'WealthOS' : 'Customer'} · {fmtDateTime(m.created_at)}</div><p className="whitespace-pre-wrap">{m.body}</p></li>))}</ul></Section>
      {canEdit && r.status !== 'closed' && <Section title="Reply"><ActionForm action={staffReply} submit="Send reply" className="grid gap-3"><input type="hidden" name="request_id" value={id} /><F label="Message"><textarea required name="body" rows={4} className={inp} /></F><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="close" /> Close the request after replying</label></ActionForm></Section>}
    </div>
  );
}
