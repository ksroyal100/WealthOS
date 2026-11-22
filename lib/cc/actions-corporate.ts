'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { run, ok, clean, checked, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();
const slug = z.string().regex(/^[a-z0-9-]{2,60}$/, 'use lowercase letters, numbers and hyphens');
const refreshPublic = () => { revalidatePath('/', 'layout'); };

export async function saveOrgUnit(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), slug, name: z.string().min(2).max(120), kind: z.enum(['parent_company', 'division', 'department', 'team', 'subsidiary']),
      parent_slug: z.string().optional(), description: z.string().max(500).optional(), status: z.enum(['planned', 'active', 'paused', 'closed']),
      legal_status: z.enum(['unknown', 'not_a_legal_entity', 'legal_entity']), legal_name: z.string().max(200).optional(), jurisdiction: z.string().max(120).optional(), registration_number: z.string().max(80).optional() }).parse(clean(fd));
    const listed = checked(fd, 'public_listed');
    const s = await requirePermission('org', v.id ? 'edit' : 'create');
    if (listed) await requirePermission('org', 'approve');            // making a unit public is an approval-level action
    const db = admin();
    let parent_id: string | null = null;
    if (v.parent_slug) { const p = await db.from('org_units').select('id').eq('slug', v.parent_slug).maybeSingle(); parent_id = (p.data?.id as string | undefined) ?? null; if (!parent_id) throw new Error('Parent unit not found'); }
    const legal = v.legal_status === 'legal_entity';
    const row = { slug: v.slug, name: v.name, kind: v.kind, parent_id, description: v.description ?? null, status: v.status, legal_status: v.legal_status,
      legal_name: legal ? v.legal_name ?? null : null, jurisdiction: legal ? v.jurisdiction ?? null : null, registration_number: legal ? v.registration_number ?? null : null, public_listed: listed, updated_at: new Date().toISOString() };
    const r = v.id ? await db.from('org_units').update(row).eq('id', v.id).select('id').single() : await db.from('org_units').insert(row).select('id').single();
    const id = must(r).id as string;
    await audit(s.userId, v.id ? 'edit' : 'create', 'org_unit', id, 'success', { public_listed: listed });
    revalidatePath('/command-center/corporate'); refreshPublic();
    return ok();
  });
}

export async function saveLeadershipPosition(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, appointment_status: z.enum(['vacant', 'announced', 'acting', 'appointed']), responsibilities: z.string().max(1000).optional() }).parse(clean(fd));
    const s = await requirePermission('leadership', v.appointment_status === 'appointed' ? 'approve' : 'edit');
    must(await admin().from('leadership_positions').update({ appointment_status: v.appointment_status, responsibilities: v.responsibilities ?? null }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'leadership_position', v.id, 'success', { status: v.appointment_status });
    revalidatePath('/command-center/corporate/leadership'); refreshPublic();
    return ok();
  });
}

export async function saveExecutive(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), position_id: uuid, full_name: z.string().min(2).max(120), headline: z.string().max(160).optional(), bio: z.string().max(3000).optional() }).parse(clean(fd));
    const s = await requirePermission('leadership', v.id ? 'edit' : 'create');
    const db = admin();
    const row = { position_id: v.position_id, full_name: v.full_name, headline: v.headline ?? null, bio: v.bio ?? null, updated_at: new Date().toISOString() };
    // Editing a verified public profile sends it back for re-verification.
    const r = v.id ? await db.from('executive_profiles').update({ ...row, verified_at: null, verified_by: null, visibility: 'hidden' }).eq('id', v.id).select('id').single() : await db.from('executive_profiles').insert(row).select('id').single();
    const id = must(r).id as string;
    await audit(s.userId, v.id ? 'edit' : 'create', 'executive_profile', id);
    revalidatePath('/command-center/corporate/leadership'); refreshPublic();
    return ok(v.id ? 'Saved. The profile is hidden until it is verified again.' : 'Profile created. It stays hidden until verified.');
  });
}

export async function verifyExecutive(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const id = uuid.parse(fd.get('id'));
    const s = await requirePermission('leadership', 'approve');
    const db = admin();
    const p = must(await db.from('executive_profiles').select('staff_user_id,full_name').eq('id', id).single());
    if (p.staff_user_id && p.staff_user_id === s.userId) throw new Error('You cannot verify your own profile. Another authorized person must do it.');
    must(await db.from('executive_profiles').update({ verified_at: new Date().toISOString(), verified_by: s.userId }).eq('id', id).select('id').single());
    await audit(s.userId, 'verify', 'executive_profile', id, 'approved');
    revalidatePath('/command-center/corporate/leadership');
    return ok('Verified. You can now choose its visibility.');
  });
}

export async function setExecutiveVisibility(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, visibility: z.enum(['hidden', 'internal', 'public']) }).parse(clean(fd));
    const s = await requirePermission('leadership', v.visibility === 'public' ? 'approve' : 'edit');
    must(await admin().from('executive_profiles').update({ visibility: v.visibility }).eq('id', v.id).select('id').single());   // the database refuses public unless verified and appointed
    await audit(s.userId, v.visibility === 'public' ? 'publish' : 'edit', 'executive_profile', v.id, 'success', { visibility: v.visibility });
    revalidatePath('/command-center/corporate/leadership'); refreshPublic();
    return ok();
  });
}

const cmsType = z.enum(['page', 'announcement', 'press_release', 'article', 'career', 'division', 'product_info', 'policy']);
export async function cmsSave(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), type: cmsType.optional(), slug: z.string().regex(/^[a-z0-9-]{2,80}$/).optional(), title: z.string().min(2).max(200),
      summary: z.string().max(400).optional(), body: z.string().max(100000).optional(), topic: z.string().max(60).optional() }).parse(clean(fd));
    const s = await requirePermission('cms', v.id ? 'edit' : 'create');
    if (!v.id && (!v.type || !v.slug)) throw new Error('Choose a type and a URL slug.');
    const { data, error } = await admin().rpc('cms_save', { p_user: s.userId, p_doc: v.id ?? null, p_type: v.type ?? null, p_slug: v.slug ?? null, p_title: v.title, p_summary: v.summary ?? null, p_body: v.body ?? null, p_topic: v.topic ?? null });
    if (error) throw error;
    revalidatePath('/command-center/cms');
    return ok('Saved as draft.', v.id ? undefined : `/command-center/cms/${data}`);
  });
}

export async function cmsTransition(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, to: z.enum(['in_review', 'draft', 'approved', 'published', 'unpublished']), note: z.string().max(500).optional(), schedule: z.string().optional() }).parse(clean(fd));
    const s = await requirePermission('cms', v.to === 'in_review' || (v.to === 'draft' && !v.note) ? 'edit' : 'approve');
    const when = v.schedule ? new Date(v.schedule).toISOString() : null;
    const { error } = await admin().rpc('cms_transition', { p_doc: v.id, p_user: s.userId, p_to: v.to, p_note: v.note ?? null, p_schedule: when });
    if (error) throw error;
    revalidatePath('/command-center/cms'); revalidatePath(`/command-center/cms/${v.id}`); refreshPublic();
    return ok(`Moved to ${v.to.replace('_', ' ')}.`);
  });
}
