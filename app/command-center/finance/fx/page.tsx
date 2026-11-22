import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Table, Td, Pill, F, inp, SubNav } from '@/components/cc/kit';
import { saveFxRate } from '@/lib/cc/actions-finance';

export const metadata = { title: 'Currency and consolidation' };
const cents = (n: unknown) => BigInt(Math.round(Number(n) * 100));
const show = (c: bigint) => `${c < 0n ? '-' : ''}${(c < 0n ? -c : c) / 100n}.${((c < 0n ? -c : c) % 100n).toString().padStart(2, '0')}`;

export default async function Fx({ searchParams }: { searchParams: Promise<{ target?: string; month?: string }> }) {
  const staff = await requirePermission('fx', 'view');
  const sp = await searchParams;
  const target = /^[A-Za-z]{3}$/.test(sp.target ?? '') ? sp.target!.toUpperCase() : 'USD';
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : new Date().toISOString().slice(0, 7);
  const db = admin();
  const [{ data: rates }, { data: rows }, canCreate] = await Promise.all([db.from('fx_rates').select('*').order('as_of', { ascending: false }).limit(100), db.rpc('consolidate', { p_target: target, p_month: `${month}-01` }), can(staff, 'fx', 'create')]);
  const list = (rows ?? []) as any[];
  const total = list.filter((r) => r.status !== 'missing_rate').reduce((s, r) => s + cents(r.converted ?? r.net), 0n);
  const missing = list.filter((r) => r.status === 'missing_rate');
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Currency and consolidation" desc="Different currencies are never added together silently. A consolidated figure exists only where a documented exchange rate with a named source is on record." />
      <SubNav current="/command-center/finance/fx" items={[['Ledger', '/command-center/finance'], ['Currency and consolidation', '/command-center/finance/fx']]} />
      <Section title="Consolidated net result (received and paid money only)">
        <form className="mb-4 flex flex-wrap items-end gap-3"><F label="Month"><input type="month" name="month" defaultValue={month} className={inp} /></F><F label="Report in"><input name="target" defaultValue={target} maxLength={3} className={inp} /></F><button className="rounded bg-[#0E3B2E] px-4 py-2 text-sm text-white">Show</button></form>
        <Table caption="Consolidation" head={['Currency', 'Net (native)', 'Rate', 'Rate date', 'Source', `Converted to ${target}`, 'Basis']} empty={list.length === 0}>
          {list.map((r) => (<tr key={r.currency}><Td>{r.currency}</Td><Td className="tabular-nums">{Number(r.net).toFixed(2)}</Td><Td className="tabular-nums">{r.rate ?? ''}</Td><Td>{r.rate_as_of ?? ''}</Td><Td>{r.rate_source ?? ''}</Td><Td className="tabular-nums">{r.converted == null ? 'n/a' : Number(r.converted).toFixed(2)}</Td><Td>{r.status === 'missing_rate' ? <Pill tone="bad">no rate on record</Pill> : r.status === 'native' ? <Pill tone="good">native</Pill> : <Pill tone="warn">converted</Pill>}</Td></tr>))}
        </Table>
        {list.length > 0 && <p className="mt-3 text-sm"><b>Consolidated total in {target}: {show(total)}</b>{missing.length > 0 && <span className="text-red-700"> (excludes {missing.map((m) => m.currency).join(', ')}: add a documented rate to include)</span>}</p>}
      </Section>
      {canCreate && <Section title="Record an exchange rate">
        <ActionForm action={saveFxRate} submit="Record rate"><F label="From currency"><input required name="base" maxLength={3} placeholder="EUR" className={inp} /></F><F label="To currency"><input required name="quote" maxLength={3} placeholder="USD" className={inp} /></F>
          <F label="Rate (1 unit of From = ? To)"><input required name="rate" inputMode="decimal" className={inp} /></F><F label="Rate date"><input required type="date" name="as_of" className={inp} /></F><F label="Source (required, for example a central bank reference)" span={2}><input required name="source" className={inp} /></F></ActionForm></Section>}
      <Section title="Rates on record"><Table caption="Exchange rates" head={['Pair', 'Rate', 'Date', 'Source']} empty={(rates ?? []).length === 0}>{(rates ?? []).map((r: any) => (<tr key={r.id}><Td>{r.base}/{r.quote}</Td><Td className="tabular-nums">{r.rate}</Td><Td>{r.as_of}</Td><Td>{r.source}</Td></tr>))}</Table></Section>
    </div>
  );
}
