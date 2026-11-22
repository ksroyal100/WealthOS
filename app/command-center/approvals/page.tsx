import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, F, inp, fmtDateTime } from '@/components/cc/kit';
import { requestApproval, decideApproval, saveApprovalPolicy, setApprovalLimit } from '@/lib/cc/actions-finance';

export const metadata = { title: 'Financial approvals' };

export default async function Approvals() {
  const staff = await requirePermission('finance', 'view');
  const db = admin();
  const [{ data }, { data: decisions }, { data: policies }, { data: limits }, { data: people }, canApprove, canCreate] = await Promise.all([
    db.from('approvals').select('*').order('created_at', { ascending: false }).limit(100), db.from('approval_decisions').select('approval_id,level,decided_by,decision,reason,at').order('level'),
    db.from('approval_policies').select('*').order('currency').order('min_amount'), db.from('approval_limits').select('user_id,currency,max_amount'),
    db.from('staff_members').select('user_id,full_name').eq('status', 'active'), can(staff, 'finance', 'approve'), can(staff, 'finance', 'create')]);
  const name = (id: string) => (people ?? []).find((p: any) => p.user_id === id)?.full_name ?? 'Unknown';
  const mine = (limits ?? []).filter((l: any) => l.user_id === staff.userId);
  const admin2 = staff.roles.includes('ceo') || staff.roles.includes('cfo');
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Financial approvals" desc="Large requests need more than one approver. Nobody can approve their own request, one person cannot supply two approvals, every approver is held to their own limit, and rejections need a reason. All of this is enforced in the database." />
      {canApprove && <p className="mb-4 text-sm">{mine.length ? <>Your limits: {mine.map((l: any) => `${l.currency} ${l.max_amount}`).join(', ')}.</> : <span className="text-amber-800">You have no approval limit set, so you cannot approve amounts yet.</span>}</p>}
      <div className="space-y-3">{(data ?? []).length === 0 && <p className="text-sm text-slate-600">No approval requests yet.</p>}
        {(data ?? []).map((a: any) => {
          const ds = (decisions ?? []).filter((d: any) => d.approval_id === a.id) as any[];
          const done = ds.filter((d) => d.decision === 'approved').length;
          const decidedByMe = ds.some((d) => d.decided_by === staff.userId);
          return (
            <article key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><b>{a.subject}</b><Pill tone={toneFor(a.status)}>{a.status}</Pill></div>
              <p className="text-slate-600">{a.kind.replace('_', ' ')} · {a.amount != null ? `${a.currency} ${a.amount}` : 'no amount'} · requested by {name(a.requested_by)} · {fmtDateTime(a.created_at)}</p>
              <p className="mt-1">Approvals: {done} of {a.required_levels} required</p>
              {ds.length > 0 && <ul className="mt-1 text-slate-600">{ds.map((d) => <li key={d.level}>Level {d.level}: {d.decision} by {name(d.decided_by)}{d.reason ? `, "${d.reason}"` : ''}</li>)}</ul>}
              {a.status === 'pending' && canApprove && a.requested_by !== staff.userId && !decidedByMe && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <ActionForm action={decideApproval} submit="Approve" compact className="flex"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="approved" /></ActionForm>
                  <ActionForm action={decideApproval} submit="Reject" danger compact className="flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="rejected" /><F label="Reason (required)"><input required name="reason" className={inp} /></F></ActionForm></div>)}
              {a.status === 'pending' && a.requested_by === staff.userId && <p className="mt-2 text-slate-600">You requested this, so someone else must decide it.</p>}
            </article>);
        })}</div>
      {canCreate && <div className="mt-6"><Section title="Request approval"><ActionForm action={requestApproval} submit="Submit request"><F label="Type"><input required name="kind" placeholder="vendor_payment" className={inp} /></F><F label="Subject"><input required name="subject" className={inp} /></F><F label="Amount"><input required name="amount" inputMode="decimal" className={inp} /></F><F label="Currency"><input required name="currency" defaultValue="USD" maxLength={3} className={inp} /></F></ActionForm></Section></div>}
      <Section title="Approval policy: how many approvals a request needs">
        <ul className="mb-3 text-sm">{(policies ?? []).length === 0 && <li className="text-slate-600">No policy set. Every request needs one approval.</li>}{(policies ?? []).map((p: any) => <li key={p.id}>{p.currency} {p.min_amount} and above needs {p.required_levels} approval{p.required_levels > 1 ? 's' : ''}</li>)}</ul>
        {admin2 && <ActionForm action={saveApprovalPolicy} submit="Save policy"><F label="Currency"><input required name="currency" defaultValue="USD" maxLength={3} className={inp} /></F><F label="From amount"><input required name="min_amount" inputMode="decimal" className={inp} /></F><F label="Approvals required"><input required type="number" min={1} max={5} name="required_levels" defaultValue={2} className={inp} /></F></ActionForm>}
      </Section>
      {staff.roles.includes('ceo') && <Section title="Approval limits (Founder and CEO only)">
        <ul className="mb-3 text-sm">{(limits ?? []).map((l: any) => <li key={l.user_id + l.currency}>{name(l.user_id)}: up to {l.currency} {l.max_amount}</li>)}</ul>
        <ActionForm action={setApprovalLimit} submit="Set limit"><F label="Person"><select name="user_id" className={inp}>{(people ?? []).filter((p: any) => p.user_id !== staff.userId).map((p: any) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}</select></F><F label="Currency"><input required name="currency" defaultValue="USD" maxLength={3} className={inp} /></F><F label="Largest amount they may approve"><input required name="max_amount" inputMode="decimal" className={inp} /></F></ActionForm></Section>}
    </div>
  );
}
