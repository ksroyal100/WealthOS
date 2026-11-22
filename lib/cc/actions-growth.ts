'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cur = z.string().regex(/^[A-Za-z]{3}$/).transform((c) => c.toUpperCase());
const refresh = () => { for (const p of ['', '/pipeline', '/partnerships', '/inquiries']) revalidatePath('/command-center/crm' + p); };

export async function saveCompany(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), name: z.string().min(2).max(160), kind: z.enum(['prospect', 'client', 'partner', 'vendor', 'other']), status: z.enum(['active', 'inactive']).default('active'), website: z.string().url().optional(), notes: z.string().max(2000).optional() }).parse(clean(fd));
    const s = await requirePermission('crm', v.id ? 'edit' : 'create');
    const db = admin();
    const r = v.id ? await db.from('crm_companies').update(v).eq('id', v.id).select('id').single() : await db.from('crm_companies').insert({ ...v, created_by: s.userId }).select('id').single();
    await audit(s.userId, v.id ? 'edit' : 'create', 'crm_company', must(r).id); refresh(); return ok();
  });
}
export async function saveContact(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ company_id: uuid.optional(), full_name: z.string().min(2).max(120), email: z.string().email().optional(), phone: z.string().max(40).optional(), title: z.string().max(100).optional() }).parse(clean(fd));
    const s = await requirePermission('crm', 'create');
    const r = must(await admin().from('crm_contacts').insert({ ...v, company_id: v.company_id ?? null }).select('id').single());
    await audit(s.userId, 'create', 'crm_contact', r.id); refresh(); return ok('Contact added.');
  });
}
export async function saveDeal(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ company_id: uuid.optional(), title: z.string().min(2).max(160), value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), currency: cur.default('USD'), expected_close: day.optional() }).parse(clean(fd));
    const s = await requirePermission('crm', 'create');
    const r = must(await admin().from('crm_deals').insert({ ...v, company_id: v.company_id ?? null, owner_id: s.userId }).select('id').single());
    await audit(s.userId, 'create', 'crm_deal', r.id); refresh(); return ok('Deal added.');
  });
}
export async function setDealStage(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']) }).parse(clean(fd));
    const s = await requirePermission('crm', 'edit');
    must(await admin().from('crm_deals').update({ stage: v.stage, updated_at: new Date().toISOString(), closed_at: ['won', 'lost'].includes(v.stage) ? new Date().toISOString() : null }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'crm_deal', v.id, 'success', { stage: v.stage }); refresh(); return ok();
  });
}
export async function addActivity(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ deal_id: uuid.optional(), company_id: uuid.optional(), kind: z.enum(['call', 'email', 'meeting', 'note', 'task']), summary: z.string().min(2).max(1000), follow_up_on: day.optional() }).parse(clean(fd));
    const s = await requirePermission('crm', 'create');
    must(await admin().from('crm_activities').insert({ ...v, deal_id: v.deal_id ?? null, company_id: v.company_id ?? null, created_by: s.userId }).select('id').single()); refresh(); return ok('Logged.');
  });
}
export async function completeActivity(_: State, fd: FormData): Promise<State> {
  return run(async () => { const id = uuid.parse(fd.get('id')); await requirePermission('crm', 'edit'); must(await admin().from('crm_activities').update({ done: true }).eq('id', id).select('id').single()); refresh(); return ok('Done.'); });
}
export async function savePartnership(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), company_id: uuid, title: z.string().min(2).max(160), status: z.enum(['exploring', 'negotiating', 'active', 'paused', 'ended']), summary: z.string().max(2000).optional() }).parse(clean(fd));
    const s = await requirePermission('crm', v.id ? 'edit' : 'create');
    const db = admin();
    const r = v.id ? await db.from('partnerships').update(v).eq('id', v.id).select('id').single() : await db.from('partnerships').insert({ ...v, owner_id: s.userId }).select('id').single();
    await audit(s.userId, v.id ? 'edit' : 'create', 'partnership', must(r).id); refresh(); return ok();
  });
}
export async function setInquiryStatus(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, status: z.enum(['new', 'in_progress', 'answered', 'spam']) }).parse(clean(fd));
    const s = await requirePermission('crm', 'edit');
    must(await admin().from('inquiries').update({ status: v.status, handled_by: s.userId }).eq('id', v.id).select('id').single()); refresh(); return ok();
  });
}

export async function saveCampaign(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), name: z.string().min(2).max(160), status: z.enum(['planned', 'active', 'paused', 'completed']), channel: z.string().max(80).optional(), objective: z.string().max(500).optional(),
      budget: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), currency: cur.default('USD'), starts_on: day.optional(), ends_on: day.optional(), results_notes: z.string().max(2000).optional() }).parse(clean(fd));
    if (v.starts_on && v.ends_on && v.ends_on < v.starts_on) throw new Error('The end date cannot be before the start date.');
    const s = await requirePermission('marketing', v.id ? 'edit' : 'create');
    const db = admin();
    const r = v.id ? await db.from('campaigns').update(v).eq('id', v.id).select('id').single() : await db.from('campaigns').insert({ ...v, owner_id: s.userId, created_by: s.userId }).select('id').single();
    await audit(s.userId, v.id ? 'edit' : 'create', 'campaign', must(r).id); revalidatePath('/command-center/marketing'); return ok();
  });
}
