import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, FilterBar, F, inp, SubNav } from '@/components/cc/kit';
import { saveCompany, saveContact } from '@/lib/cc/actions-growth';

export const metadata = { title: 'Companies and contacts' };
export const CRM_NAV: [string, string][] = [['Companies and contacts', '/command-center/crm'], ['Sales pipeline', '/command-center/crm/pipeline'], ['Partnerships', '/command-center/crm/partnerships'], ['Business inquiries', '/command-center/crm/inquiries']];

export default async function Crm({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const staff = await requirePermission('crm', 'view'); const sp = await searchParams; const db = admin();
  let q = db.from('crm_companies').select('*').order('name').limit(300);
  if (sp.status) q = q.eq('kind', sp.status);
  if (sp.q) q = q.ilike('name', `%${sp.q.replace(/[%_]/g, '')}%`);
  const [{ data: cos }, { data: contacts }, cc] = await Promise.all([q, db.from('crm_contacts').select('*').order('full_name').limit(500), can(staff, 'crm', 'create')]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Companies and contacts" desc="Prospects, clients, partners and the people at them. Filter by kind using the status box." />
      <SubNav current="/command-center/crm" items={CRM_NAV} />
      <FilterBar q={sp.q} status={sp.status} statuses={['prospect', 'client', 'partner', 'vendor', 'other']} />
      <Table caption="Companies" head={['Company', 'Kind', 'Status', 'Contacts']} empty={(cos ?? []).length === 0}>
        {(cos ?? []).map((c: any) => (<tr key={c.id}><Td><b>{c.name}</b><div className="text-xs text-slate-600">{c.website}</div></Td><Td>{c.kind}</Td><Td><Pill tone={toneFor(c.status)}>{c.status}</Pill></Td><Td>{(contacts ?? []).filter((x: any) => x.company_id === c.id).map((x: any) => `${x.full_name}${x.email ? ` <${x.email}>` : ''}`).join('; ')}</Td></tr>))}
      </Table>
      {cc && <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Add a company"><ActionForm action={saveCompany} submit="Add company" className="grid gap-3"><F label="Name"><input required name="name" className={inp} /></F><F label="Kind"><select name="kind" className={inp}>{['prospect', 'client', 'partner', 'vendor', 'other'].map((k) => <option key={k}>{k}</option>)}</select></F><F label="Website"><input type="url" name="website" className={inp} /></F><F label="Notes"><input name="notes" className={inp} /></F></ActionForm></Section>
        <Section title="Add a contact"><ActionForm action={saveContact} submit="Add contact" className="grid gap-3"><F label="Company"><select name="company_id" className={inp}><option value="">None</option>{(cos ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F><F label="Full name"><input required name="full_name" className={inp} /></F><F label="Email"><input type="email" name="email" className={inp} /></F><F label="Title"><input name="title" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
