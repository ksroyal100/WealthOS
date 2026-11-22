import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, SubNav } from '@/components/cc/kit';
import { savePosition, addCandidate, setCandidateStage } from '@/lib/cc/actions-people';

export const metadata = { title: 'Recruitment' };
const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
const NAV: [string, string][] = [['Directory', '/command-center/hr'], ['Recruitment', '/command-center/hr/recruitment'], ['Leave', '/command-center/hr/leave']];

export default async function Recruitment() {
  const staff = await requirePermission('hr', 'view'); const db = admin();
  const [{ data: positions }, { data: cands }, { data: units }, cc, ce] = await Promise.all([db.from('hr_positions').select('*').order('created_at', { ascending: false }), db.from('hr_candidates').select('*').order('updated_at', { ascending: false }).limit(300), db.from('org_units').select('slug,name'), can(staff, 'hr', 'create'), can(staff, 'hr', 'edit')]);
  const pos = (id: string | null) => (positions ?? []).find((p: any) => p.id === id)?.title ?? 'No position';
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Recruitment" desc="Open positions and the candidate pipeline." />
      <SubNav current="/command-center/hr/recruitment" items={NAV} />
      <Section title="Pipeline overview"><div className="flex flex-wrap gap-3 text-sm">{STAGES.map((s) => <div key={s} className="rounded border px-3 py-2"><div className="text-xs text-slate-600">{s}</div><div className="text-lg font-semibold">{(cands ?? []).filter((c: any) => c.stage === s).length}</div></div>)}</div></Section>
      <Table caption="Candidates" head={['Candidate', 'Position', 'Stage', 'Source', 'Move to']} empty={(cands ?? []).length === 0}>
        {(cands ?? []).map((c: any) => (<tr key={c.id}><Td><b>{c.full_name}</b><div className="text-xs text-slate-600">{c.email}</div></Td><Td>{pos(c.hr_position_id)}</Td><Td><Pill tone={toneFor(c.stage)}>{c.stage}</Pill></Td><Td>{c.source}</Td>
          <Td>{ce && <ActionForm action={setCandidateStage} submit="Move" compact resetOnSuccess={false} className="flex items-center gap-2"><input type="hidden" name="id" value={c.id} /><select name="stage" defaultValue={c.stage} aria-label="Stage" className="rounded border p-1 text-sm">{STAGES.map((s) => <option key={s}>{s}</option>)}</select></ActionForm>}</Td></tr>))}
      </Table>
      {cc && <div className="mt-6"><Section title="Add a candidate"><ActionForm action={addCandidate} submit="Add candidate"><F label="Full name"><input required name="full_name" className={inp} /></F><F label="Email"><input type="email" name="email" className={inp} /></F>
        <F label="Position"><select name="hr_position_id" className={inp}><option value="">None</option>{(positions ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></F><F label="Source"><input name="source" className={inp} /></F><F label="Notes" span={2}><input name="notes" className={inp} /></F></ActionForm></Section></div>}
      <Section title="Positions"><Table caption="Positions" head={['Title', 'Department', 'Headcount', 'Status']} empty={(positions ?? []).length === 0}>{(positions ?? []).map((p: any) => <tr key={p.id}><Td className="font-medium">{p.title}</Td><Td>{(units ?? []).length ? '' : ''}</Td><Td>{p.headcount}</Td><Td><Pill tone={toneFor(p.status)}>{p.status}</Pill></Td></tr>)}</Table>
        {cc && <div className="mt-4"><ActionForm action={savePosition} submit="Add position"><F label="Title"><input required name="title" className={inp} /></F><F label="Department"><select name="org_unit" className={inp}><option value="">None</option>{(units ?? []).map((u: any) => <option key={u.slug} value={u.slug}>{u.name}</option>)}</select></F><F label="Headcount"><input type="number" min={1} name="headcount" defaultValue={1} className={inp} /></F><F label="Status"><select name="status" className={inp}>{['draft', 'open', 'filled', 'closed'].map((s) => <option key={s}>{s}</option>)}</select></F><F label="Description" span={2}><input name="description" className={inp} /></F></ActionForm></div>}</Section>
    </div>
  );
}
