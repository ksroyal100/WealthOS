'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission, requireStaff } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();
const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'enter an amount like 1250.50');
const cur = z.string().regex(/^[A-Za-z]{3}$/, 'use a 3-letter currency code').transform((c) => c.toUpperCase());

export async function requestApproval(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ kind: z.string().min(2).max(40), subject: z.string().min(2).max(200), amount: money, currency: cur }).parse(clean(fd));
    const s = await requirePermission('finance', 'create');
    const { data, error } = await admin().rpc('request_approval', { p_user: s.userId, p_kind: v.kind, p_subject: v.subject, p_amount: v.amount, p_currency: v.currency });
    if (error) throw error;
    const { data: ap } = await admin().from('approvals').select('required_levels').eq('id', data).single();
    revalidatePath('/command-center/approvals');
    return ok(`Request submitted. It needs ${ap?.required_levels ?? 1} approval${(ap?.required_levels ?? 1) > 1 ? 's' : ''}.`);
  });
}

export async function decideApproval(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, decision: z.enum(['approved', 'rejected']), reason: z.string().max(500).optional() }).parse(clean(fd));
    const s = await requirePermission('finance', 'approve');
    const { error } = await admin().rpc('decide_approval', { p_id: v.id, p_user: s.userId, p_decision: v.decision, p_reason: v.reason ?? null });
    if (error) { await audit(s.userId, 'decide', 'approval', v.id, 'denied', { why: error.message }); throw error; }
    revalidatePath('/command-center/approvals');
    return ok(v.decision === 'approved' ? 'Your approval is recorded.' : 'Rejected.');
  });
}

export async function saveApprovalPolicy(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ currency: cur, min_amount: money, required_levels: z.coerce.number().int().min(1).max(5) }).parse(clean(fd));
    const s = await requirePermission('finance', 'approve');
    if (!s.roles.includes('ceo') && !s.roles.includes('cfo')) throw new Error('Only the Founder and CEO or the CFO can change approval policy.');
    must(await admin().from('approval_policies').upsert({ kind: '*', currency: v.currency, min_amount: v.min_amount, required_levels: v.required_levels }, { onConflict: 'kind,currency,min_amount' }).select('id').single());
    await audit(s.userId, 'edit', 'approval_policy', null, 'success', v);
    revalidatePath('/command-center/approvals'); return ok('Policy saved.');
  });
}

export async function setApprovalLimit(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ user_id: uuid, currency: cur, max_amount: money }).parse(clean(fd));
    const s = await requirePermission('finance', 'approve');
    if (!s.roles.includes('ceo')) throw new Error('Only the Founder and CEO can set approval limits.');
    if (v.user_id === s.userId) throw new Error('You cannot set your own approval limit.');
    must(await admin().from('approval_limits').upsert({ user_id: v.user_id, currency: v.currency, max_amount: v.max_amount }, { onConflict: 'user_id,currency' }).select('user_id').single());
    await audit(s.userId, 'edit', 'approval_limit', v.user_id, 'success', { currency: v.currency, max: v.max_amount });
    revalidatePath('/command-center/approvals'); return ok('Limit saved.');
  });
}

export async function saveFxRate(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ base: cur, quote: cur, rate: z.string().regex(/^\d+(\.\d{1,8})?$/, 'enter a positive rate'), as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), source: z.string().min(3, 'name the source of this rate').max(200) }).parse(clean(fd));
    if (v.base === v.quote) throw new Error('Choose two different currencies.');
    if (Number(v.rate) <= 0) throw new Error('The rate must be greater than zero.');
    const s = await requirePermission('fx', 'create');
    must(await admin().from('fx_rates').insert({ ...v, recorded_by: s.userId }).select('id').single());
    await audit(s.userId, 'create', 'fx_rate', null, 'success', { pair: `${v.base}/${v.quote}`, as_of: v.as_of });
    revalidatePath('/command-center/finance/fx'); return ok('Rate recorded.');
  });
}

export async function saveVendor(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), name: z.string().min(2).max(120), status: z.enum(['active', 'inactive']).default('active'), notes: z.string().max(500).optional() }).parse(clean(fd));
    const s = await requirePermission('finance', v.id ? 'edit' : 'create');
    const db = admin();
    const r = v.id ? await db.from('vendors').update({ name: v.name, status: v.status, notes: v.notes ?? null }).eq('id', v.id).select('id').single() : await db.from('vendors').insert({ name: v.name, status: v.status, notes: v.notes ?? null }).select('id').single();
    await audit(s.userId, v.id ? 'edit' : 'create', 'vendor', must(r).id); revalidatePath('/command-center/finance/vendors'); return ok();
  });
}
