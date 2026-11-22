import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Pill, toneFor, Table, Td, FilterBar, SubNav, fmtDateTime } from '@/components/cc/kit';
import { setInquiryStatus } from '@/lib/cc/actions-growth';

export const metadata = { title: 'Business inquiries' };
const ST = ['new', 'in_progress', 'answered', 'spam'];
const NAV: [string, string][] = [['Companies and contacts', '/command-center/crm'], ['Sales pipeline', '/command-center/crm/pipeline'], ['Partnerships', '/command-center/crm/partnerships'], ['Business inquiries', '/command-center/crm/inquiries']];

export default async function Inquiries({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const staff = await requirePermission('crm', 'view'); const sp = await searchParams;
  let q = admin().from('inquiries').select('*').order('created_at', { ascending: false }).limit(200);
  if (sp.status && ST.includes(sp.status)) q = q.eq('status', sp.status);
  if (sp.q) q = q.ilike('name', `%${sp.q.replace(/[%_]/g, '')}%`);
  const [{ data }, ce] = await Promise.all([q, can(staff, 'crm', 'edit')]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Business inquiries" desc="Messages sent through the public Contact page. Treat the content as untrusted text." />
      <SubNav current="/command-center/crm/inquiries" items={NAV} />
      <FilterBar q={sp.q} status={sp.status} statuses={ST} />
      <Table caption="Inquiries" head={['From', 'Topic', 'Message', 'Received', 'Status']} empty={(data ?? []).length === 0}>
        {(data ?? []).map((i: any) => (<tr key={i.id}><Td><b>{i.name}</b><div className="text-xs">{i.email}</div></Td><Td>{i.topic}</Td><Td className="max-w-md whitespace-pre-wrap">{i.message}</Td><Td>{fmtDateTime(i.created_at)}</Td>
          <Td><Pill tone={toneFor(i.status)}>{i.status.replace('_', ' ')}</Pill>{ce && <ActionForm action={setInquiryStatus} submit="Set" compact resetOnSuccess={false} className="mt-1 flex gap-1"><input type="hidden" name="id" value={i.id} /><select name="status" defaultValue={i.status} aria-label="Status" className="rounded border p-1 text-xs">{ST.map((s) => <option key={s}>{s}</option>)}</select></ActionForm>}</Td></tr>))}
      </Table>
    </div>
  );
}
