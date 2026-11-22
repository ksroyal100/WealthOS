'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const refresh = () => { revalidatePath('/command-center/hr'); revalidatePath('/command-center/hr/recruitment'); revalidatePath('/command-center/hr/leave'); };
async function unitId(slug?: string) { if (!slug) return null; const { data } = await admin().from('org_units').select('id').eq('slug', slug).maybeSingle(); return (data?.id as string | undefined) ?? null; }

export async function saveEmployee(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), full_name: z.string().min(2).max(120), work_email: z.string().email().optional(), org_unit: z.string().optional(), position_title: z.string().max(120).optional(), manager_id: uuid.optional(),
      employment_status: z.enum(['onboarding', 'active', 'on_leave', 'terminated']), employment_type: z.enum(['full_time', 'part_time', 'contractor', 'intern']).optional(), start_date: day.optional(), end_date: day.optional() }).parse(clean(fd));
    const s = await requirePermission('hr', v.id ? 'edit' : 'create');
    const row = { full_name: v.full_name, work_email: v.work_email ?? null, org_unit_id: await unitId(v.org_unit), position_title: v.position_title ?? null, manager_id: v.manager_id ?? null,
      employment_status: v.employment_status, employment_type: v.employment_type ?? null, start_date: v.start_date ?? null, end_date: v.end_date ?? null };
    const db = admin();
    const r = v.id ? await db.from('hr_employees').update(row).eq('id', v.id).select('id').single() : await db.from('hr_employees').insert(row).select('id').single();
    await audit(s.userId, v.id ? 'edit' : 'create', 'employee', must(r).id); refresh(); return ok();
  });
}

export async function saveEmployeePrivate(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ employee_id: uuid, personal_email: z.string().email().optional(), phone: z.string().max(40).optional(), compensation_amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      compensation_currency: z.string().length(3).optional(), compensation_period: z.enum(['year', 'month', 'hour']).optional() }).parse(clean(fd));
    const s = await requirePermission('hr_sensitive', 'edit');
    must(await admin().from('hr_employee_private').upsert({ employee_id: v.employee_id, personal_email: v.personal_email ?? null, phone: v.phone ?? null, compensation_amount: v.compensation_amount ?? null,
      compensation_currency: v.compensation_currency?.toUpperCase() ?? null, compensation_period: v.compensation_period ?? null, updated_at: new Date().toISOString() }, { onConflict: 'employee_id' }).select('employee_id').single());
    await audit(s.userId, 'edit', 'employee_private', v.employee_id);          // the values themselves are never written to the log
    refresh(); return ok('Sensitive details saved.');
  });
}

export async function savePosition(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), title: z.string().min(2).max(120), org_unit: z.string().optional(), headcount: z.coerce.number().int().min(1).max(500), status: z.enum(['draft', 'open', 'filled', 'closed']), description: z.string().max(2000).optional() }).parse(clean(fd));
    const s = await requirePermission('hr', v.id ? 'edit' : 'create');
    const row = { title: v.title, org_unit_id: await unitId(v.org_unit), headcount: v.headcount, status: v.status, description: v.description ?? null };
    const db = admin();
    const r = v.id ? await db.from('hr_positions').update(row).eq('id', v.id).select('id').single() : await db.from('hr_positions').insert(row).select('id').single();
    await audit(s.userId, v.id ? 'edit' : 'create', 'hr_position', must(r).id); refresh(); return ok();
  });
}

export async function addCandidate(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ full_name: z.string().min(2).max(120), email: z.string().email().optional(), hr_position_id: uuid.optional(), source: z.string().max(80).optional(), notes: z.string().max(2000).optional() }).parse(clean(fd));
    const s = await requirePermission('hr', 'create');
    const r = must(await admin().from('hr_candidates').insert({ ...v, hr_position_id: v.hr_position_id ?? null }).select('id').single());
    await audit(s.userId, 'create', 'candidate', r.id); refresh(); return ok('Candidate added.');
  });
}

export async function setCandidateStage(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, stage: z.enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']) }).parse(clean(fd));
    const s = await requirePermission('hr', 'edit');
    must(await admin().from('hr_candidates').update({ stage: v.stage, updated_at: new Date().toISOString() }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'candidate', v.id, 'success', { stage: v.stage }); refresh(); return ok();
  });
}

export async function addOnboardingTask(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ employee_id: uuid, title: z.string().min(2).max(160), due_on: day.optional() }).parse(clean(fd));
    const s = await requirePermission('hr', 'create');
    must(await admin().from('hr_onboarding_tasks').insert({ employee_id: v.employee_id, title: v.title, due_on: v.due_on ?? null, assigned_to: s.userId }).select('id').single()); refresh(); return ok('Task added.');
  });
}
export async function completeOnboardingTask(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const id = uuid.parse(fd.get('id')); await requirePermission('hr', 'edit');
    must(await admin().from('hr_onboarding_tasks').update({ done_at: new Date().toISOString() }).eq('id', id).select('id').single()); refresh(); return ok('Done.');
  });
}

export async function requestLeave(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ employee_id: uuid, leave_type: z.enum(['vacation', 'sick', 'personal', 'unpaid', 'other']), start_date: day, end_date: day, reason: z.string().max(500).optional() }).parse(clean(fd));
    if (v.end_date < v.start_date) throw new Error('The end date cannot be before the start date.');
    const s = await requirePermission('hr', 'create');
    must(await admin().from('hr_leave_requests').insert(v).select('id').single());
    await audit(s.userId, 'create', 'leave_request', v.employee_id); refresh(); return ok('Leave request submitted.');
  });
}

export async function decideLeave(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, decision: z.enum(['approved', 'rejected']), note: z.string().max(500).optional() }).parse(clean(fd));
    const s = await requirePermission('hr', 'approve');
    const r = await admin().rpc('decide_leave', { p_actor: s.userId, p_id: v.id, p_decision: v.decision, p_note: v.note ?? null });
    if (r.error) throw r.error; refresh(); return ok(v.decision === 'approved' ? 'Leave approved.' : 'Leave rejected.');
  });
}
