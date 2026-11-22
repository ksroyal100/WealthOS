import { requirePermission } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requirePermission('dashboard', 'view');
    const { data } = await admin().from('data_sources').select('kind,status,last_synced_at');
    return Response.json({ sources: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
