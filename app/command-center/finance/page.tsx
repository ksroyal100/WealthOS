import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls, Unavailable } from '@/components/ui';
import { addLedgerEntry } from '@/lib/cc/actions';
import LedgerTable from '@/components/ledger-table';

export const dynamic = 'force-dynamic';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function Finance({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requirePermission('finance', 'view');
  const sp = await searchParams;
  const db = admin();
  let q = db.from('ledger_entries').select('id,occurred_on,kind,category,status,amount,currency,description').order('occurred_on', { ascending: false }).limit(500);
  if (sp.product && /^[0-9a-f-]{36}$/.test(sp.product)) q = q.eq('product_id', sp.product);
  if (sp.kind && ['revenue', 'refund', 'fee', 'expense'].includes(sp.kind)) q = q.eq('kind', sp.kind);
  if (sp.status && ['estimated', 'pending', 'received', 'paid', 'failed', 'reversed'].includes(sp.status)) q = q.eq('status', sp.status);
  if (sp.category && sp.category.length < 60) q = q.eq('category', sp.category);
  if (sp.from && DATE.test(sp.from)) q = q.gte('occurred_on', sp.from);
  if (sp.to && DATE.test(sp.to)) q = q.lte('occurred_on', sp.to);
  const [{ data: rows }, { data: monthly }, { data: products }, canCreate, canExport] = await Promise.all([
    q, db.from('v_monthly_financials').select('*').order('month', { ascending: false }).limit(12),
    db.from('products').select('id,name'), can(staff, 'finance', 'create'), can(staff, 'finance', 'export'),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Finance and accounts</h1><div className="flex gap-4 text-sm underline"><a href="/command-center/finance/invoices">Invoices</a><a href="/command-center/finance/budgets">Budgets</a><a href="/command-center/approvals">Approvals</a></div></div>
      <Card title="Monthly summary (received and paid only)">
        {(monthly ?? []).length === 0 ? <Unavailable what="Ledger data" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[#4A5A6A]"><th>Month</th><th>Gross</th><th>Refunds</th><th>Fees</th><th>Expenses</th><th>Net revenue</th><th>Estimated, not received</th></tr></thead>
            <tbody>{(monthly ?? []).map((m: any, i: number) => <tr key={i} className="border-t"><td>{m.month}</td><td>{m.gross_revenue}</td><td>{m.refunds}</td><td>{m.fees}</td><td>{m.expenses}</td><td>{m.net_revenue}</td><td>{m.estimated_revenue_not_received}</td></tr>)}</tbody></table></div>)}
      </Card>

      <Card title="Filter">
        <form className="grid gap-3 md:grid-cols-6">
          <Field label="Product"><select name="product" defaultValue={sp.product ?? ''} className={inputCls}><option value="">All</option>{(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Type"><select name="kind" defaultValue={sp.kind ?? ''} className={inputCls}><option value="">All</option>{['revenue', 'refund', 'fee', 'expense'].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Status"><select name="status" defaultValue={sp.status ?? ''} className={inputCls}><option value="">All</option>{['estimated', 'pending', 'received', 'paid', 'failed', 'reversed'].map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Category"><input name="category" defaultValue={sp.category ?? ''} className={inputCls} /></Field>
          <Field label="From"><input type="date" name="from" defaultValue={sp.from ?? ''} className={inputCls} /></Field>
          <Field label="To"><input type="date" name="to" defaultValue={sp.to ?? ''} className={inputCls} /></Field>
          <div className="flex gap-3"><button className={btnCls}>Apply filters</button>{canExport && <a className="self-center text-sm underline" href={`/api/cc/finance/export?${qs}`}>Export CSV</a>}</div>
        </form>
      </Card>

      <LedgerTable rows={(rows ?? []) as any} />

      {canCreate && (
        <Card title="Record a transaction">
          <form action={addLedgerEntry} className="grid gap-3 md:grid-cols-4">
            <Field label="Date"><input required type="date" name="occurred_on" className={inputCls} /></Field>
            <Field label="Type"><select name="kind" className={inputCls}>{['revenue', 'refund', 'fee', 'expense'].map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Status"><select name="status" className={inputCls}>{['estimated', 'pending', 'received', 'paid', 'failed', 'reversed'].map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Category"><input required name="category" placeholder="software, marketing..." className={inputCls} /></Field>
            <Field label="Amount"><input required name="amount" inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={inputCls} /></Field>
            <Field label="Currency"><input name="currency" defaultValue="USD" maxLength={3} className={inputCls} /></Field>
            <Field label="Product"><select name="product_id" className={inputCls}><option value="">None</option>{(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Description"><input name="description" className={inputCls} /></Field>
            <Field label="Vendor (for expenses)"><input name="vendor" className={inputCls} /></Field>
            <button className={btnCls}>Save transaction</button>
          </form>
        </Card>)}
    </div>
  );
}
