import { sessionClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Tiny identity endpoint for the site header: who is signed in, and whether they are active staff. */
export async function GET() {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const { data: s } = await admin().from('staff_members').select('status').eq('user_id', user.id).maybeSingle();
  const name = (user.user_metadata?.full_name as string | undefined)?.trim() || (user.email ?? 'Account').split('@')[0];
  return Response.json({ email: user.email, name, isStaff: s?.status === 'active' }, { headers: { 'Cache-Control': 'no-store' } });
}
