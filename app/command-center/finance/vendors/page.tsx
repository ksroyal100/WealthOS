import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Table, Td, Pill, toneFor, F, inp, SubNav } from '@/components/cc/kit';
import { saveVendor } from '@/lib/cc/actions-finance';

export const metadata = { title: 'Vendors' };

export default async function Vendors() {
  const staff = await requirePermission('finance', 'view');
  const { data } = await admin().from('vendors').select('*').order('name');
  const [cc, ce] = await Promise.all([can(staff, 'finance', 'create'), can(staff, 'finance', 'edit')]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Vendors" desc="Suppliers that expenses and payables are recorded against." />
      <SubNav current="/command-center/finance/vendors" items={[['Ledger', '/command-center/finance'], ['Receivables and payables', '/command-center/finance/ap-ar'], ['Vendors', '/command-center/finance/vendors']]} />
      <Table caption="Vendors" head={['Vendor', 'Status', 'Notes', '']} empty={(data ?? []).length === 0}>
        {(data ?? []).map((v: any) => (<tr key={v.id}><Td className="font-medium">{v.name}</Td><Td><Pill tone={toneFor(v.status)}>{v.status}</Pill></Td><Td>{v.notes}</Td>
          <Td>{ce && <details><summary className="cursor-pointer text-xs underline">Edit</summary><div className="mt-2 w-80"><ActionForm action={saveVendor} submit="Save" resetOnSuccess={false} className="grid gap-2"><input type="hidden" name="id" value={v.id} /><F label="Name"><input name="name" defaultValue={v.name} className={inp} /></F><F label="Status"><select name="status" defaultValue={v.status} className={inp}><option>active</option><option>inactive</option></select></F><F label="Notes"><input name="notes" defaultValue={v.notes ?? ''} className={inp} /></F></ActionForm></div></details>}</Td></tr>))}
      </Table>
      {cc && <div className="mt-6"><Section title="Add a vendor"><ActionForm action={saveVendor} submit="Add vendor"><F label="Name"><input required name="name" className={inp} /></F><F label="Notes" span={2}><input name="notes" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
