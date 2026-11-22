import Link from 'next/link';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, FilterBar, F, inp, fmtDate } from '@/components/cc/kit';
import { createDocument } from '@/lib/cc/actions-legal';
import { docResource } from '@/lib/cc/doc-policy';

export const metadata = { title: 'Legal and documents' };
const ST = ['draft', 'active', 'expired', 'archived'];

export default async function Legal({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const staff = await requirePermission('legal', 'view'); const sp = await searchParams;
  let q = admin().from('documents').select('*').order('expires_on', { ascending: true, nullsFirst: false }).limit(300);
  if (sp.status && ST.includes(sp.status)) q = q.eq('status', sp.status);
  if (sp.q) q = q.ilike('title', `%${sp.q.replace(/[%_]/g, '')}%`);
  const [{ data }, seeConf, seeHr, canCreate] = await Promise.all([q, can(staff, 'legal_confidential', 'view'), can(staff, 'hr', 'view'), can(staff, 'legal', 'create')]);
  // Only documents this person is allowed to see are listed at all.
  const docs = ((data ?? []) as any[]).filter((d) => { const r = docResource(d.category, d.confidentiality); return r === 'legal' || (r === 'legal_confidential' && seeConf) || (r === 'hr' && seeHr); });
  const soon = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10); const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Legal and documents" desc="Contracts, agreements and policies. Files live in private storage and are never public. Download is a separate permission, links last 60 seconds, and every download is logged." />
      <FilterBar q={sp.q} status={sp.status} statuses={ST} />
      <Table caption="Documents" head={['Title', 'Category', 'Confidentiality', 'Status', 'Version', 'Expires']} empty={docs.length === 0}>
        {docs.map((d) => (<tr key={d.id}><Td><Link href={`/command-center/legal/${d.id}`} className="font-medium underline">{d.title}</Link><div className="text-xs text-slate-600">{d.counterparty}</div></Td><Td>{d.category}</Td><Td><Pill tone={d.confidentiality === 'confidential' ? 'bad' : d.confidentiality === 'restricted' ? 'warn' : 'neutral'}>{d.confidentiality}</Pill></Td><Td><Pill tone={toneFor(d.status)}>{d.status}</Pill></Td><Td>{d.current_version ? `v${d.current_version}` : 'no file'}</Td>
          <Td>{d.expires_on ? <span className={d.expires_on < today ? 'font-semibold text-red-700' : d.expires_on <= soon ? 'font-semibold text-amber-700' : ''}>{fmtDate(d.expires_on)}{d.expires_on < today ? ' (expired)' : d.expires_on <= soon ? ' (soon)' : ''}</span> : ''}</Td></tr>))}
      </Table>
      {canCreate && <div className="mt-6"><Section title="Add a document record"><ActionForm action={createDocument} submit="Create and continue to upload">
        <F label="Title" span={2}><input required name="title" className={inp} /></F><F label="Counterparty"><input name="counterparty" className={inp} /></F>
        <F label="Category"><select name="category" className={inp}>{['contract', 'agreement', 'policy', 'corporate', 'hr', 'technical', 'other'].map((c) => <option key={c}>{c}</option>)}</select></F>
        <F label="Confidentiality"><select name="confidentiality" defaultValue="restricted" className={inp}><option>internal</option><option>restricted</option><option value="confidential" disabled={!seeConf}>confidential (needs special permission)</option></select></F>
        <F label="Effective from"><input type="date" name="effective_on" className={inp} /></F><F label="Expires on"><input type="date" name="expires_on" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
