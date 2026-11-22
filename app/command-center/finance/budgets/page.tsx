import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls } from '@/components/ui';
import { saveBudget } from '@/lib/cc/actions';
import { sumMoney, toCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function Budgets({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const staff = await requirePermission('finance', 'view');
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : new Date().toISOString().slice(0, 7);
  const start = `${month}-01`; const end = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 0)).toISOString().slice(0, 10);
  const db = admin();
  const [{ data: budgets }, { data: spend }, canCreate] = await Promise.all([
    db.from('budgets').select('category,amount,currency').eq('month', start).is('product_id', null),
    db.from('ledger_entries').select('category,amount,currency').eq('kind', 'expense').eq('status', 'paid').gte('occurred_on', start).lte('occurred_on', end),
    can(staff, 'finance', 'create'),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Budgets</h1>
      <form className="flex items-end gap-3"><Field label="Month"><input type="month" name="month" defaultValue={month} className={inputCls} /></Field><button className={btnCls}>View</button></form>
      <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F3F5F7]"><tr><th className="p-2">Category</th><th>Budget</th><th>Actual (paid)</th><th>Remaining</th></tr></thead>
        <tbody>{(budgets ?? []).length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-600">No budgets set for this month.</td></tr> : (budgets ?? []).map((b: any) => {
          const actual = sumMoney((spend ?? []).filter((s: any) => s.category === b.category && s.currency === b.currency).map((s: any) => s.amount));
          const left = toCents(b.amount) - toCents(actual);
          return (<tr key={b.category} className="border-t"><td className="p-2">{b.category}</td><td className="tabular-nums">{b.currency} {b.amount}</td><td className="tabular-nums">{b.currency} {actual}</td><td className={left < 0n ? 'font-semibold text-red-700' : ''}>{left < 0n ? 'Over by ' : ''}{b.currency} {(Number(left < 0n ? -left : left) / 100).toFixed(2)}</td></tr>); })}</tbody></table></div>
      {canCreate && <Card title="Set a budget"><form action={saveBudget} className="grid gap-3 md:grid-cols-4"><Field label="Month"><input required type="month" name="month" defaultValue={month} className={inputCls} /></Field>
        <Field label="Category"><input required name="category" placeholder="software, marketing..." className={inputCls} /></Field><Field label="Amount"><input required name="amount" inputMode="decimal" className={inputCls} /></Field>
        <Field label="Currency"><input name="currency" defaultValue="USD" maxLength={3} className={inputCls} /></Field><button className={btnCls}>Save budget</button></form></Card>}
    </div>
  );
}
