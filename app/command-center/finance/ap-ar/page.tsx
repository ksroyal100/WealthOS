import { requirePermission } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { PageHeader, Section, Table, Td, Pill, SubNav } from '@/components/cc/kit';

export const metadata = { title: 'Receivables and payables' };
const today = () => new Date().toISOString().slice(0, 10);

export default async function ApAr() {
  await requirePermission('finance', 'view');
  const db = admin();
  const [{ data: aging }, { data: open }] = await Promise.all([db.from('v_ar_ap_aging').select('*'), db.from('invoices').select('id,number,counterparty,direction,amount,currency,due_on').eq('status', 'open').order('due_on', { ascending: true, nullsFirst: false }).limit(200)]);
  const rows = (aging ?? []) as any[];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Receivables and payables" desc="Open invoices by age, kept separate by currency. Receivables are money owed to WealthOS; payables are money WealthOS owes." />
      <SubNav current="/command-center/finance/ap-ar" items={[['Ledger', '/command-center/finance'], ['Receivables and payables', '/command-center/finance/ap-ar'], ['Invoices', '/command-center/finance/invoices'], ['Vendors', '/command-center/finance/vendors']]} />
      {['receivable', 'payable'].map((dir) => (
        <Section key={dir} title={dir === 'receivable' ? 'Accounts receivable (owed to us)' : 'Accounts payable (we owe)'}>
          <Table caption={`${dir} aging`} head={['Currency', 'Current', '1 to 30 days late', '31 to 60', '61 to 90', 'Over 90', 'Total open']} empty={!rows.some((r) => r.direction === dir)}>
            {rows.filter((r) => r.direction === dir).map((r) => (<tr key={r.currency}><Td>{r.currency}</Td><Td className="tabular-nums">{r.current_amount}</Td><Td className="tabular-nums">{r.days_1_30}</Td><Td className="tabular-nums">{r.days_31_60}</Td><Td className="tabular-nums">{r.days_61_90}</Td><Td className={`tabular-nums ${Number(r.over_90) > 0 ? 'font-semibold text-red-700' : ''}`}>{r.over_90}</Td><Td className="font-medium tabular-nums">{r.total_open}</Td></tr>))}
          </Table>
        </Section>))}
      <Section title="Open invoices">
        <Table caption="Open invoices" head={['Number', 'Counterparty', 'Direction', 'Amount', 'Due', 'State']} empty={(open ?? []).length === 0}>
          {(open ?? []).map((i: any) => (<tr key={i.id}><Td>{i.number}</Td><Td>{i.counterparty}</Td><Td>{i.direction}</Td><Td className="tabular-nums">{i.currency} {i.amount}</Td><Td>{i.due_on ?? 'none'}</Td><Td>{i.due_on && i.due_on < today() ? <Pill tone="bad">overdue</Pill> : <Pill>open</Pill>}</Td></tr>))}
        </Table>
      </Section>
    </div>
  );
}
