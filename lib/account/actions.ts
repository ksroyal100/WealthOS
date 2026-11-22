'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export async function updateProfile(fd: FormData): Promise<void> {
  const v = z.object({ full_name: z.string().trim().max(120) }).parse({ full_name: fd.get('full_name') ?? '' });
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not signed in');
  // RLS guarantees this can only touch the caller's own row.
  await sb.from('customer_profiles').upsert({ user_id: user.id, full_name: v.full_name || null, marketing_opt_in: fd.get('marketing_opt_in') === 'on', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  revalidatePath('/account');
}

/** Privacy-rights request (e.g. CCPA delete). Recorded for staff follow-up; nothing is deleted automatically. */
export async function requestDeletion(): Promise<void> {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await admin().from('alerts').insert({ severity: 'info', kind: 'deletion_request', message: 'A customer asked to delete their account and data.', source: user.id });
  await admin().from('audit_log').insert({ actor_id: user.id, action: 'request_deletion', resource: 'customer', outcome: 'success' });
  revalidatePath('/account');
}
