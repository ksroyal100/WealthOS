'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const refresh = () => { for (const p of ['', '/incidents', '/docs']) revalidatePath('/command-center/engineering' + p); revalidatePath('/command-center'); };

export async function saveRelease(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ product_id: uuid, version: z.string().min(1).max(40), planned_for: day.optional(), notes: z.string().max(3000).optional() }).parse(clean(fd));
    const s = await requirePermission('engineering', 'create', v.product_id);
    const r = must(await admin().from('releases').insert({ ...v, created_by: s.userId }).select('id').single());
    await audit(s.userId, 'create', 'release', r.id); refresh(); return ok('Release planned.');
  });
}
export async function setReleaseStatus(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, status: z.enum(['planned', 'in_progress', 'released', 'rolled_back']) }).parse(clean(fd));
    const db = admin();
    const rel = must(await db.from('releases').select('product_id').eq('id', v.id).single());
    const s = await requirePermission('engineering', v.status === 'released' ? 'approve' : 'edit', rel.product_id);      // shipping needs approval-level permission
    must(await db.from('releases').update({ status: v.status, released_at: v.status === 'released' ? new Date().toISOString() : null }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'release', v.id, 'success', { status: v.status }); refresh(); return ok();
  });
}
export async function logDeployment(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ product_id: uuid, release_id: uuid.optional(), environment: z.enum(['production', 'staging']), status: z.enum(['success', 'failed', 'rolled_back']),
      commit_sha: z.string().regex(/^[0-9a-f]{7,40}$/i, 'use a 7 to 40 character commit hash').optional(), notes: z.string().max(1000).optional() }).parse(clean(fd));
    const s = await requirePermission('engineering', 'create', v.product_id);
    const r = must(await admin().from('deployments').insert({ ...v, release_id: v.release_id ?? null, commit_sha: v.commit_sha?.toLowerCase() ?? null, deployed_by: s.userId }).select('id').single());
    await audit(s.userId, 'create', 'deployment', r.id, 'success', { env: v.environment, status: v.status }); refresh(); return ok('Deployment logged.');
  });
}
export async function openIncident(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ product_id: uuid.optional(), title: z.string().min(3).max(200), severity: z.enum(['sev1', 'sev2', 'sev3', 'sev4']), summary: z.string().max(3000).optional() }).parse(clean(fd));
    const s = await requirePermission('engineering', 'create', v.product_id);
    const r = must(await admin().from('incidents').insert({ ...v, product_id: v.product_id ?? null, owner_id: s.userId, created_by: s.userId }).select('id').single());
    await audit(s.userId, 'create', 'incident', r.id, 'success', { severity: v.severity }); refresh();
    return ok(v.severity === 'sev1' || v.severity === 'sev2' ? 'Incident opened. A critical alert was raised and the CEO was notified.' : 'Incident opened.');
  });
}
export async function addIncidentUpdate(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ incident_id: uuid, body: z.string().min(2).max(4000) }).parse(clean(fd));
    const s = await requirePermission('engineering', 'edit');
    must(await admin().from('incident_updates').insert({ ...v, author: s.userId }).select('id').single()); refresh(); return ok('Update posted.');
  });
}
export async function setIncidentStatus(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, status: z.enum(['open', 'investigating', 'mitigated', 'resolved', 'closed']), postmortem: z.string().max(10000).optional() }).parse(clean(fd));
    const s = await requirePermission('engineering', 'edit');
    const done = v.status === 'resolved' || v.status === 'closed';
    must(await admin().from('incidents').update({ status: v.status, resolved_at: done ? new Date().toISOString() : null, ...(v.postmortem ? { postmortem: v.postmortem } : {}) }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'incident', v.id, 'success', { status: v.status }); refresh(); return ok();
  });
}
export async function saveTechDoc(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid.optional(), product_id: uuid.optional(), title: z.string().min(2).max(200), body: z.string().max(100000).optional() }).parse(clean(fd));
    const s = await requirePermission('engineering', v.id ? 'edit' : 'create');
    const db = admin();
    if (v.id) { const cur = must(await db.from('tech_docs').select('version').eq('id', v.id).single()); must(await db.from('tech_docs').update({ title: v.title, body: v.body ?? null, version: cur.version + 1, updated_by: s.userId, updated_at: new Date().toISOString() }).eq('id', v.id).select('id').single()); }
    else must(await db.from('tech_docs').insert({ title: v.title, body: v.body ?? null, product_id: v.product_id ?? null, updated_by: s.userId }).select('id').single());
    await audit(s.userId, v.id ? 'edit' : 'create', 'tech_doc', v.id ?? null); refresh(); return ok();
  });
}
