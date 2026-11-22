import Link from 'next/link';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, FilterBar, F, inp, SubNav, fmtDateTime } from '@/components/cc/kit';
import { cmsSave } from '@/lib/cc/actions-corporate';
import { publicPath } from '@/lib/cms-routes';

export const metadata = { title: 'Website content' };
const TYPES = ['page', 'announcement', 'press_release', 'article', 'career', 'division', 'product_info', 'policy'];
const STATUSES = ['draft', 'in_review', 'approved', 'published', 'unpublished'];

export default async function Cms({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string }> }) {
  const staff = await requirePermission('cms', 'view');
  const sp = await searchParams;
  let q = admin().from('cms_documents').select('id,type,slug,title,status,version,updated_at,published_at').order('updated_at', { ascending: false }).limit(200);
  if (sp.status && STATUSES.includes(sp.status)) q = q.eq('status', sp.status);
  if (sp.type && TYPES.includes(sp.type)) q = q.eq('type', sp.type);
  if (sp.q) q = q.ilike('title', `%${sp.q.replace(/[%_]/g, '')}%`);
  const [{ data }, { count: review }, canCreate] = await Promise.all([q, admin().from('cms_documents').select('id', { count: 'exact', head: true }).eq('status', 'in_review'), can(staff, 'cms', 'create')]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Website content" desc="Everything on the public website is written, reviewed, approved and published here. Nothing appears publicly until someone other than the author approves it." actions={review ? <Pill tone="warn">{review} waiting for review</Pill> : undefined} />
      <SubNav current="/command-center/cms" items={[['Structure', '/command-center/corporate'], ['Leadership', '/command-center/corporate/leadership'], ['Website content', '/command-center/cms']]} />
      <FilterBar q={sp.q} status={sp.status} statuses={STATUSES} extra={<label className="text-sm">Type<select name="type" defaultValue={sp.type ?? ''} className="mt-1 block rounded border border-slate-300 p-2"><option value="">All</option>{TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></label>} />
      <Table caption="Content documents" head={['Title', 'Type', 'Status', 'Version', 'Address', 'Updated']} empty={(data ?? []).length === 0}>
        {(data ?? []).map((d: any) => (<tr key={d.id}><Td><Link className="font-medium underline" href={`/command-center/cms/${d.id}`}>{d.title}</Link></Td><Td>{d.type.replace('_', ' ')}</Td><Td><Pill tone={toneFor(d.status)}>{d.status.replace('_', ' ')}</Pill></Td><Td>v{d.version}</Td><Td className="text-xs">{publicPath(d.type, d.slug) ?? 'not routed'}</Td><Td>{fmtDateTime(d.updated_at)}</Td></tr>))}
      </Table>
      {canCreate && <div className="mt-6"><Section title="New content">
        <ActionForm action={cmsSave} submit="Create draft">
          <F label="Type"><select name="type" className={inp}>{TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></F>
          <F label="Address slug"><input required name="slug" pattern="[a-z0-9-]{2,80}" placeholder="for example: mission" className={inp} /></F>
          <F label="Topic (media only)"><select name="topic" className={inp}><option value="">None</option><option value="financial-education">Financial Education</option><option value="business">Business</option><option value="technology">Technology</option><option value="research">Research</option></select></F>
          <F label="Title" span={2}><input required name="title" className={inp} /></F><F label="Summary"><input name="summary" maxLength={400} className={inp} /></F>
          <F label="Body (plain text; a blank line starts a new paragraph)" span={3}><textarea name="body" rows={6} className={inp} /></F>
        </ActionForm></Section></div>}
    </div>
  );
}
