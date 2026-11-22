import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls } from '@/components/ui';
import { createInvoice, setInvoiceStatus } from '@/lib/cc/actions';

export const dynamic = 'force-dynamic';

export default async function Invoices() {
  const staff = await requirePermission('finance', 'view');
  const { data } = await admin().from('invoices').select('*').order('issued_on', { ascending: false }).limit(200);
  const [cc, ce] = await Promise.all([can(staff, 'finance', 'create'), can(staff, 'finance', 'edit')]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F3F5F7]"><tr><th className="p-2">Number</th><th>Counterparty</th><th>Direction</th><th>Amount</th><th>Issued</th><th>Due</th><th>Status</th><th /></tr></thead>
        <tbody>{(data ?? []).length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-slate-600">No invoices yet.</td></tr> : (data ?? []).map((i: any) => {
          const late = i.status === 'open' && i.due_on && i.due_on < today;
          return (<tr key={i.id} className="border-t"><td className="p-2">{i.number}</td><td>{i.counterparty}</td><td>{i.direction}</td><td className="tabular-nums">{i.currency} {i.amount}</td><td>{i.issued_on}</td><td>{i.due_on ?? ''}</td><td>{late ? <b className="text-red-700">overdue</b> : i.status}</td>
            <td>{ce && i.status === 'open' && <form action={setInvoiceStatus} className="flex gap-3 text-xs underline"><input type="hidden" name="id" value={i.id} /><button name="status" value="paid">Mark paid</button><button name="status" value="void">Void</button></form>}</td></tr>); })}</tbody></table></div>
      {cc && <Card title="New invoice"><form action={createInvoice} className="grid gap-3 md:grid-cols-4">
        <Field label="Number"><input required name="number" className={inputCls} /></Field><Field label="Counterparty"><input required name="counterparty" className={inputCls} /></Field>
        <Field label="Direction"><select name="direction" className={inputCls}><option value="receivable">Receivable (owed to us)</option><option value="payable">Payable (we owe)</option></select></Field>
        <Field label="Amount"><input required name="amount" inputMode="decimal" className={inputCls} /></Field><Field label="Currency"><input name="currency" defaultValue="USD" maxLength={3} className={inputCls} /></Field>
        <Field label="Issued"><input required type="date" name="issued_on" className={inputCls} /></Field><Field label="Due"><input type="date" name="due_on" className={inputCls} /></Field><button className={btnCls}>Create invoice</button></form></Card>}
    </div>
  );
}
