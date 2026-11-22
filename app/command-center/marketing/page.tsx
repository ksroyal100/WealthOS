import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, FilterBar, F, inp, fmtDate } from '@/components/cc/kit';
import { saveCampaign } from '@/lib/cc/actions-growth';

export const metadata = { title: 'Campaigns' };
const ST = ['planned', 'active', 'paused', 'completed'];

export default async function Marketing({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const staff = await requirePermission('marketing', 'view'); const sp = await searchParams;
  let q = admin().from('campaigns').select('*').order('starts_on', { ascending: false, nullsFirst: false }).limit(200);
  if (sp.status && ST.includes(sp.status)) q = q.eq('status', sp.status);
  if (sp.q) q = q.ilike('name', `%${sp.q.replace(/[%_]/g, '')}%`);
  const [{ data }, cc, ce] = await Promise.all([q, can(staff, 'marketing', 'create'), can(staff, 'marketing', 'edit')]);
  const Fields = ({ c }: { c?: any }) => (<>{c && <input type="hidden" name="id" value={c.id} />}<F label="Name"><input required name="name" defaultValue={c?.name} className={inp} /></F><F label="Channel"><input name="channel" defaultValue={c?.channel ?? ''} className={inp} /></F><F label="Status"><select name="status" defaultValue={c?.status ?? 'planned'} className={inp}>{ST.map((s) => <option key={s}>{s}</option>)}</select></F>
    <F label="Budget"><input name="budget" inputMode="decimal" defaultValue={c?.budget ?? ''} className={inp} /></F><F label="Currency"><input name="currency" maxLength={3} defaultValue={c?.currency ?? 'USD'} className={inp} /></F><F label="Starts"><input type="date" name="starts_on" defaultValue={c?.starts_on ?? ''} className={inp} /></F><F label="Ends"><input type="date" name="ends_on" defaultValue={c?.ends_on ?? ''} className={inp} /></F>
    <F label="Objective" span={2}><input name="objective" defaultValue={c?.objective ?? ''} className={inp} /></F><F label="Results (measured, not estimated)" span={3}><input name="results_notes" defaultValue={c?.results_notes ?? ''} className={inp} /></F></>);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Campaigns" desc="Marketing projects, budgets and results. Budgets are plans; spend appears in Finance only when it is recorded there." />
      <FilterBar q={sp.q} status={sp.status} statuses={ST} />
      <Table caption="Campaigns" head={['Campaign', 'Channel', 'Status', 'Budget (planned)', 'Dates', '']} empty={(data ?? []).length === 0}>
        {(data ?? []).map((c: any) => (<tr key={c.id}><Td className="font-medium">{c.name}<div className="text-xs font-normal text-slate-600">{c.objective}</div></Td><Td>{c.channel}</Td><Td><Pill tone={toneFor(c.status)}>{c.status}</Pill></Td><Td className="tabular-nums">{c.budget != null ? `${c.currency} ${c.budget}` : ''}</Td><Td>{fmtDate(c.starts_on)} to {fmtDate(c.ends_on)}</Td>
          <Td>{ce && <details><summary className="cursor-pointer text-xs underline">Edit</summary><div className="mt-2 w-[min(90vw,44rem)]"><ActionForm action={saveCampaign} submit="Save" resetOnSuccess={false}><Fields c={c} /></ActionForm></div></details>}</Td></tr>))}
      </Table>
      {cc && <div className="mt-6"><Section title="New campaign"><ActionForm action={saveCampaign} submit="Create campaign"><Fields /></ActionForm></Section></div>}
    </div>
  );
}
