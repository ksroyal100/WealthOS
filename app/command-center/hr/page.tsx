import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, FilterBar, F, inp, SubNav, fmtDate } from '@/components/cc/kit';
import { saveEmployee, saveEmployeePrivate, addOnboardingTask, completeOnboardingTask } from '@/lib/cc/actions-people';

export const metadata = { title: 'People directory' };
const ST = ['onboarding', 'active', 'on_leave', 'terminated'];
export const HR_NAV: [string, string][] = [['Directory', '/command-center/hr'], ['Recruitment', '/command-center/hr/recruitment'], ['Leave', '/command-center/hr/leave']];

export default async function Hr({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const staff = await requirePermission('hr', 'view');
  const sp = await searchParams; const db = admin();
  let q = db.from('hr_employees').select('*').order('full_name').limit(300);
  if (sp.status && ST.includes(sp.status)) q = q.eq('employment_status', sp.status);
  if (sp.q) q = q.ilike('full_name', `%${sp.q.replace(/[%_]/g, '')}%`);
  const [{ data: emps }, { data: units }, { data: tasks }, canCreate, canEdit, seeSensitive, editSensitive] = await Promise.all([q, db.from('org_units').select('id,slug,name'), db.from('hr_onboarding_tasks').select('*').order('due_on'),
    can(staff, 'hr', 'create'), can(staff, 'hr', 'edit'), can(staff, 'hr_sensitive', 'view'), can(staff, 'hr_sensitive', 'edit')]);
  const priv: Record<string, any> = {};
  if (seeSensitive) { const { data } = await db.from('hr_employee_private').select('*'); for (const p of data ?? []) priv[(p as any).employee_id] = p; }
  const all = (emps ?? []) as any[]; const unit = (id: string | null) => (units ?? []).find((u: any) => u.id === id)?.name ?? '';
  const Fields = ({ e }: { e?: any }) => (<>
    {e && <input type="hidden" name="id" value={e.id} />}<F label="Full name"><input required name="full_name" defaultValue={e?.full_name} className={inp} /></F><F label="Work email"><input type="email" name="work_email" defaultValue={e?.work_email ?? ''} className={inp} /></F>
    <F label="Job title"><input name="position_title" defaultValue={e?.position_title ?? ''} className={inp} /></F>
    <F label="Department"><select name="org_unit" defaultValue={(units ?? []).find((u: any) => u.id === e?.org_unit_id)?.slug ?? ''} className={inp}><option value="">None</option>{(units ?? []).map((u: any) => <option key={u.slug} value={u.slug}>{u.name}</option>)}</select></F>
    <F label="Reports to"><select name="manager_id" defaultValue={e?.manager_id ?? ''} className={inp}><option value="">No one</option>{all.filter((x) => x.id !== e?.id).map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></F>
    <F label="Status"><select name="employment_status" defaultValue={e?.employment_status ?? 'onboarding'} className={inp}>{ST.map((s) => <option key={s}>{s}</option>)}</select></F>
    <F label="Type"><select name="employment_type" defaultValue={e?.employment_type ?? ''} className={inp}><option value="">Not set</option>{['full_time', 'part_time', 'contractor', 'intern'].map((s) => <option key={s}>{s}</option>)}</select></F>
    <F label="Start date"><input type="date" name="start_date" defaultValue={e?.start_date ?? ''} className={inp} /></F><F label="End date"><input type="date" name="end_date" defaultValue={e?.end_date ?? ''} className={inp} /></F></>);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="People directory" desc="Employees, departments and reporting lines. Personal contact details and compensation are kept apart and need a separate, more restricted permission." />
      <SubNav current="/command-center/hr" items={HR_NAV} />
      <FilterBar q={sp.q} status={sp.status} statuses={ST} />
      <Table caption="Employees" head={['Name', 'Department', 'Title', 'Reports to', 'Status', 'Start', '']} empty={all.length === 0}>
        {all.map((e) => (<tr key={e.id}><Td className="font-medium">{e.full_name}</Td><Td>{unit(e.org_unit_id)}</Td><Td>{e.position_title}</Td><Td>{all.find((x) => x.id === e.manager_id)?.full_name ?? ''}</Td><Td><Pill tone={toneFor(e.employment_status)}>{e.employment_status.replace('_', ' ')}</Pill></Td><Td>{fmtDate(e.start_date)}</Td>
          <Td><details><summary className="cursor-pointer text-xs underline">Open</summary><div className="mt-3 w-[min(90vw,46rem)] space-y-4">
            {canEdit && <ActionForm action={saveEmployee} submit="Save" resetOnSuccess={false}><Fields e={e} /></ActionForm>}
            <div><h4 className="mb-1 text-sm font-medium">Onboarding tasks</h4><ul className="text-sm">{(tasks ?? []).filter((t: any) => t.employee_id === e.id).map((t: any) => (<li key={t.id} className="flex items-center gap-3 py-0.5"><span className={t.done_at ? 'line-through text-slate-500' : ''}>{t.title}{t.due_on ? ` (due ${t.due_on})` : ''}</span>{!t.done_at && canEdit && <ActionForm action={completeOnboardingTask} submit="Mark done" compact className="flex"><input type="hidden" name="id" value={t.id} /></ActionForm>}</li>))}</ul>
              {canCreate && <ActionForm action={addOnboardingTask} submit="Add task" className="mt-2 grid gap-2 md:grid-cols-3"><input type="hidden" name="employee_id" value={e.id} /><F label="Task"><input required name="title" className={inp} /></F><F label="Due"><input type="date" name="due_on" className={inp} /></F></ActionForm>}</div>
            {seeSensitive && <div className="rounded border border-amber-300 bg-amber-50 p-3"><h4 className="mb-2 text-sm font-medium">Sensitive details (restricted)</h4>
              {editSensitive ? <ActionForm action={saveEmployeePrivate} submit="Save sensitive details" resetOnSuccess={false}><input type="hidden" name="employee_id" value={e.id} /><F label="Personal email"><input name="personal_email" defaultValue={priv[e.id]?.personal_email ?? ''} className={inp} /></F><F label="Phone"><input name="phone" defaultValue={priv[e.id]?.phone ?? ''} className={inp} /></F>
                <F label="Compensation amount"><input name="compensation_amount" defaultValue={priv[e.id]?.compensation_amount ?? ''} className={inp} /></F><F label="Currency"><input name="compensation_currency" maxLength={3} defaultValue={priv[e.id]?.compensation_currency ?? ''} className={inp} /></F><F label="Per"><select name="compensation_period" defaultValue={priv[e.id]?.compensation_period ?? ''} className={inp}><option value="">Not set</option><option>year</option><option>month</option><option>hour</option></select></F></ActionForm>
                : <p className="text-sm">{priv[e.id]?.personal_email ?? 'No personal email on file'}</p>}</div>}
          </div></details></Td></tr>))}
      </Table>
      {canCreate && <div className="mt-6"><Section title="Add an employee"><ActionForm action={saveEmployee} submit="Add employee"><Fields /></ActionForm></Section></div>}
    </div>
  );
}
