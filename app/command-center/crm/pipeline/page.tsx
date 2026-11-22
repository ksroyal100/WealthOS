import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, F, inp, SubNav, fmtDate } from '@/components/cc/kit';
import { saveDeal, setDealStage, addActivity, completeActivity } from '@/lib/cc/actions-growth';

export const metadata = { title: 'Sales pipeline' };
const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const NAV: [string, string][] = [['Companies and contacts', '/command-center/crm'], ['Sales pipeline', '/command-center/crm/pipeline'], ['Partnerships', '/command-center/crm/partnerships'], ['Business inquiries', '/command-center/crm/inquiries']];

export default async function Pipeline() {
  const staff = await requirePermission('crm', 'view'); const db = admin(); const today = new Date().toISOString().slice(0, 10);
  const [{ data: deals }, { data: cos }, { data: acts }, cc, ce] = await Promise.all([db.from('crm_deals').select('*').order('updated_at', { ascending: false }).limit(300), db.from('crm_companies').select('id,name').order('name'), db.from('crm_activities').select('*').order('occurred_at', { ascending: false }).limit(100), can(staff, 'crm', 'create'), can(staff, 'crm', 'edit')]);
  const co = (id: string | null) => (cos ?? []).find((c: any) => c.id === id)?.name ?? '';
  const follow = (acts ?? []).filter((a: any) => !a.done && a.follow_up_on).sort((a: any, b: any) => a.follow_up_on.localeCompare(b.follow_up_on));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Sales pipeline" desc="Deals by stage. Values stay in their own currency and are never added across currencies." />
      <SubNav current="/command-center/crm/pipeline" items={NAV} />
      <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">{STAGES.map((s) => (<section key={s} aria-label={s} className="rounded-lg border bg-white p-3"><h2 className="mb-2 text-xs font-semibold text-slate-600">{s} ({(deals ?? []).filter((d: any) => d.stage === s).length})</h2>
        <ul className="space-y-2 text-sm">{(deals ?? []).filter((d: any) => d.stage === s).map((d: any) => (<li key={d.id} className="rounded border p-2"><b>{d.title}</b><div className="text-xs text-slate-600">{co(d.company_id)}{d.value ? ` · ${d.currency} ${d.value}` : ''}</div>
          {ce && <ActionForm action={setDealStage} submit="Move" compact resetOnSuccess={false} className="mt-1 flex gap-1"><input type="hidden" name="id" value={d.id} /><select name="stage" defaultValue={d.stage} aria-label="Stage" className="rounded border p-1 text-xs">{STAGES.map((x) => <option key={x}>{x}</option>)}</select></ActionForm>}</li>))}</ul></section>))}</div>
      <Section title="Follow-ups due"><ul className="text-sm">{follow.length === 0 && <li className="text-slate-600">Nothing scheduled.</li>}{follow.map((a: any) => (<li key={a.id} className="flex items-center justify-between gap-3 py-1"><span>{a.follow_up_on < today ? <Pill tone="bad">overdue</Pill> : null} {fmtDate(a.follow_up_on)}: {a.summary}</span>{ce && <ActionForm action={completeActivity} submit="Done" compact className="flex"><input type="hidden" name="id" value={a.id} /></ActionForm>}</li>))}</ul></Section>
      {cc && <div className="grid gap-6 md:grid-cols-2">
        <Section title="Add a deal"><ActionForm action={saveDeal} submit="Add deal" className="grid gap-3"><F label="Company"><select name="company_id" className={inp}><option value="">None</option>{(cos ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F><F label="Title"><input required name="title" className={inp} /></F><F label="Value"><input name="value" inputMode="decimal" className={inp} /></F><F label="Currency"><input name="currency" defaultValue="USD" maxLength={3} className={inp} /></F><F label="Expected close"><input type="date" name="expected_close" className={inp} /></F></ActionForm></Section>
        <Section title="Log an activity"><ActionForm action={addActivity} submit="Log" className="grid gap-3"><F label="Deal"><select name="deal_id" className={inp}><option value="">None</option>{(deals ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></F><F label="Kind"><select name="kind" className={inp}>{['call', 'email', 'meeting', 'note', 'task'].map((k) => <option key={k}>{k}</option>)}</select></F><F label="Summary"><input required name="summary" className={inp} /></F><F label="Follow up on"><input type="date" name="follow_up_on" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
