import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { docResource } from '@/lib/cc/doc-policy';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Confidential files never get a public URL. After a permission check we mint a 60-second signed link and log the download. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = z.string().uuid().safeParse((await ctx.params).id);
    if (!id.success) return Response.json({ error: 'not found' }, { status: 404 });
    const db = admin();
    const { data: doc } = await db.from('documents').select('id,category,confidentiality,current_version').eq('id', id.data).maybeSingle();
    if (!doc) return Response.json({ error: 'not found' }, { status: 404 });
    const staff = await requirePermission(docResource(doc.category, doc.confidentiality), 'export');   // download is its own permission
    if (!rateLimit(`dl:${staff.userId}`, 30, 60_000)) return Response.json({ error: 'rate limited' }, { status: 429 });
    const v = Number(new URL(req.url).searchParams.get('v') ?? doc.current_version);
    const { data: ver } = await db.from('document_versions').select('storage_path,filename,version').eq('document_id', id.data).eq('version', Number.isInteger(v) ? v : doc.current_version).maybeSingle();
    if (!ver) return Response.json({ error: 'no such version' }, { status: 404 });
    const { data: signed, error } = await db.storage.from('documents').createSignedUrl(ver.storage_path, 60, { download: ver.filename });
    if (error || !signed) return Response.json({ error: 'storage unavailable' }, { status: 502 });
    await db.from('audit_log').insert({ actor_id: staff.userId, action: 'download', resource: 'document', record_id: id.data, outcome: 'success', meta: { version: ver.version } });
    return Response.redirect(signed.signedUrl, 302);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
