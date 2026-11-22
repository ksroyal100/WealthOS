import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, SubNav } from '@/components/cc/kit';
import { savePartnership } from '@/lib/cc/actions-growth';

export const metadata = { title: 'Partnerships' };
const NAV: [string, string][] = [['Companies and contacts', '/command-center/crm'], ['Sales pipeline', '/command-center/crm/pipeline'], ['Partnerships', '/command-center/crm/partnerships'], ['Business inquiries', '/command-center/crm/inquiries']];

export default async function Partnerships() {
  const staff = await requirePermission('crm', 'view'); const db = admin();
  const [{ data }, { data: cos }, cc] = await Promise.all([db.from('partnerships').select('*').order('created_at', { ascending: false }), db.from('crm_companies').select('id,name').order('name'), can(staff, 'crm', 'create')]);
  const co = (id: string) => (cos ?? []).find((c: any) => c.id === id)?.name;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Partnerships" desc="Internal record of partnership talks and agreements. Nothing here is public. To announce a partnership, publish an approved announcement under Website content." />
      <SubNav current="/command-center/crm/partnerships" items={NAV} />
      <Table caption="Partnerships" head={['Partner', 'Title', 'Status', 'Summary']} empty={(data ?? []).length === 0}>{(data ?? []).map((p: any) => <tr key={p.id}><Td className="font-medium">{co(p.company_id)}</Td><Td>{p.title}</Td><Td><Pill tone={toneFor(p.status)}>{p.status}</Pill></Td><Td>{p.summary}</Td></tr>)}</Table>
      {cc && <div className="mt-6"><Section title="Add a partnership"><ActionForm action={savePartnership} submit="Add"><F label="Company"><select required name="company_id" className={inp}>{(cos ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F><F label="Title"><input required name="title" className={inp} /></F><F label="Status"><select name="status" className={inp}>{['exploring', 'negotiating', 'active', 'paused', 'ended'].map((s) => <option key={s}>{s}</option>)}</select></F><F label="Summary" span={3}><input name="summary" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
