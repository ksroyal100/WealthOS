import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, SubNav, fmtDate } from '@/components/cc/kit';
import { requestLeave, decideLeave } from '@/lib/cc/actions-people';

export const metadata = { title: 'Leave requests' };
const NAV: [string, string][] = [['Directory', '/command-center/hr'], ['Recruitment', '/command-center/hr/recruitment'], ['Leave', '/command-center/hr/leave']];

export default async function Leave() {
  const staff = await requirePermission('hr', 'view'); const db = admin();
  const [{ data: reqs }, { data: emps }, cc, ca] = await Promise.all([db.from('hr_leave_requests').select('*').order('created_at', { ascending: false }).limit(200), db.from('hr_employees').select('id,full_name,staff_user_id').neq('employment_status', 'terminated').order('full_name'), can(staff, 'hr', 'create'), can(staff, 'hr', 'approve')]);
  const e = (id: string) => (emps ?? []).find((x: any) => x.id === id) as any;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Leave requests" desc="Nobody can decide their own leave request. Rejections need a reason." />
      <SubNav current="/command-center/hr/leave" items={NAV} />
      <Table caption="Leave requests" head={['Employee', 'Type', 'Dates', 'Status', 'Decision']} empty={(reqs ?? []).length === 0}>
        {(reqs ?? []).map((r: any) => { const emp = e(r.employee_id); const own = emp?.staff_user_id === staff.userId; return (
          <tr key={r.id}><Td className="font-medium">{emp?.full_name}</Td><Td>{r.leave_type}</Td><Td>{fmtDate(r.start_date)} to {fmtDate(r.end_date)}</Td><Td><Pill tone={toneFor(r.status)}>{r.status}</Pill></Td>
            <Td>{r.status === 'pending' && ca && !own && <div className="space-y-2"><ActionForm action={decideLeave} submit="Approve" compact className="flex"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="approved" /></ActionForm>
              <ActionForm action={decideLeave} submit="Reject" danger compact className="flex items-end gap-2"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="rejected" /><F label="Reason"><input required name="note" className={inp} /></F></ActionForm></div>}
              {r.status === 'pending' && own && <span className="text-xs text-slate-600">Your own request: someone else decides.</span>}{r.decision_note}</Td></tr>); })}
      </Table>
      {cc && <div className="mt-6"><Section title="Record a leave request"><ActionForm action={requestLeave} submit="Submit"><F label="Employee"><select name="employee_id" className={inp}>{(emps ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select></F>
        <F label="Type"><select name="leave_type" className={inp}>{['vacation', 'sick', 'personal', 'unpaid', 'other'].map((t) => <option key={t}>{t}</option>)}</select></F><F label="From"><input required type="date" name="start_date" className={inp} /></F><F label="To"><input required type="date" name="end_date" className={inp} /></F><F label="Reason" span={2}><input name="reason" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
