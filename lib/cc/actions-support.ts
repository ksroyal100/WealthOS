'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();

export async function staffReply(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ request_id: uuid, body: z.string().min(1).max(4000), close: z.string().optional() }).parse(clean(fd));
    const s = await requirePermission('support', 'edit');
    const pub = admin().schema('public');
    must(await pub.from('support_messages').insert({ request_id: v.request_id, author_user_id: s.userId, is_staff: true, body: v.body }).select('id').single());
    must(await pub.from('support_requests').update({ status: v.close ? 'closed' : 'pending', updated_at: new Date().toISOString() }).eq('id', v.request_id).select('id').single());
    await audit(s.userId, 'reply', 'support_request', v.request_id);
    revalidatePath(`/command-center/support/${v.request_id}`); revalidatePath('/command-center/support');
    return ok(v.close ? 'Reply sent and the request closed.' : 'Reply sent.');
  });
}
export async function setRequestStatus(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ id: uuid, status: z.enum(['open', 'pending', 'closed']) }).parse(clean(fd));
    const s = await requirePermission('support', 'edit');
    must(await admin().schema('public').from('support_requests').update({ status: v.status, updated_at: new Date().toISOString() }).eq('id', v.id).select('id').single());
    await audit(s.userId, 'edit', 'support_request', v.id, 'success', { status: v.status }); revalidatePath('/command-center/support'); return ok();
  });
}
