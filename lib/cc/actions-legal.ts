'use server';
import { createHash, randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';
import { docResource, ALLOWED_TYPES, MAX_BYTES, magicOk, safeFilename } from '@/lib/cc/doc-policy';

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function createDocument(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ title: z.string().min(2).max(200), category: z.enum(['contract', 'agreement', 'policy', 'corporate', 'hr', 'technical', 'other']), confidentiality: z.enum(['internal', 'restricted', 'confidential']),
      counterparty: z.string().max(160).optional(), effective_on: day.optional(), expires_on: day.optional() }).parse(clean(fd));
    const s = await requirePermission(docResource(v.category, v.confidentiality), 'create');
    const r = must(await admin().from('documents').insert({ ...v, owner_id: s.userId, created_by: s.userId }).select('id').single());
    await audit(s.userId, 'create', 'document', r.id, 'success', { category: v.category, confidentiality: v.confidentiality });
    revalidatePath('/command-center/legal');
    return ok('Document record created. Upload the first version next.', `/command-center/legal/${r.id}`);
  });
}

export async function uploadDocumentVersion(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const id = uuid.parse(fd.get('id'));
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file to upload.');
    if (file.size > MAX_BYTES) throw new Error('Files can be up to 10 MB.');
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) throw new Error('Allowed file types: PDF, Word, Excel, PNG, JPEG and plain text.');
    const db = admin();
    const doc = must(await db.from('documents').select('id,category,confidentiality,current_version,status').eq('id', id).single());
    const s = await requirePermission(docResource(doc.category, doc.confidentiality), 'edit');
    const buf = new Uint8Array(await file.arrayBuffer());
    if (!magicOk(file.type, buf)) throw new Error('The file contents do not match its type, so it was rejected.');
    const version = doc.current_version + 1;
    const path = `${id}/v${version}-${randomUUID()}.${ext}`;                       // unguessable, never exposed to the browser
    const up = await db.storage.from('documents').upload(path, buf, { contentType: file.type, upsert: false });
    if (up.error) throw new Error('Upload failed. Make sure the private "documents" storage bucket exists.');
    const ins = await db.from('document_versions').insert({ document_id: id, version, storage_path: path, filename: safeFilename(file.name), mime: file.type, size_bytes: file.size, sha256: createHash('sha256').update(buf).digest('hex'), uploaded_by: s.userId });
    if (ins.error) { await db.storage.from('documents').remove([path]); throw ins.error; }
    await db.from('documents').update({ current_version: version, status: doc.status === 'draft' ? 'active' : doc.status }).eq('id', id);
    await audit(s.userId, 'upload', 'document', id, 'success', { version, size: file.size });
    revalidatePath(`/command-center/legal/${id}`); revalidatePath('/command-center/legal');
    return ok(`Version ${version} uploaded.`);
  });
}

export async function setDocumentStatus(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, status: z.enum(['draft', 'active', 'expired', 'archived']), expires_on: day.optional() }).parse(clean(fd));
    const db = admin();
    const doc = must(await db.from('documents').select('category,confidentiality').eq('id', v.id).single());
    const s = await requirePermission(docResource(doc.category, doc.confidentiality), 'edit');
    must(await db.from('documents').update({ status: v.status, ...(v.expires_on ? { expires_on: v.expires_on } : {}) }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'document', v.id, 'success', { status: v.status });
    revalidatePath(`/command-center/legal/${v.id}`); revalidatePath('/command-center/legal');
    return ok();
  });
}
