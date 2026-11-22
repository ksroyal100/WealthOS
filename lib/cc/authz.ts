import 'server-only';
import { redirect } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { sessionClient } from '@/lib/supabase/server';

export type Action = 'view' | 'create' | 'edit' | 'approve' | 'export' | 'delete';
export type Staff = { userId: string; fullName: string; designation: string | null; roles: string[] };

async function audit(actor: string | null, action: string, resource: string, outcome: string, meta = {}) {
  await admin().from('audit_log').insert({ actor_id: actor, action, resource, outcome, meta });
}

/** Resolves the signed-in staff member or redirects. Being logged in is NOT enough. */
export async function requireStaff(): Promise<Staff> {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/command-center/login');

  const db = admin();
  const { data: staff } = await db.from('staff_members').select('*').eq('user_id', user.id).maybeSingle();
  if (!staff || staff.status !== 'active') {
    await audit(user.id, 'enter', 'command-center', 'denied');
    redirect('/');
  }

  if (staff.mfa_required) {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') redirect('/command-center/mfa');
  }

  const { data: rows } = await db.from('staff_roles').select('roles(key)').eq('user_id', user.id);
  const roles = (rows ?? []).map((r: any) => r.roles.key as string);
  return { userId: user.id, fullName: staff.full_name, designation: staff.designation, roles };
}

/** Call at the top of every page, route handler and server action that touches protected data. */
export async function requirePermission(resource: string, action: Action, productId?: string): Promise<Staff> {
  const staff = await requireStaff();
  const { data } = await admin().rpc('has_permission', {
    p_user: staff.userId, p_resource: resource, p_action: action, p_product: productId ?? null,
  });
  if (data !== true) {
    await audit(staff.userId, action, resource, 'denied', { productId });
    throw new Response('Forbidden', { status: 403 });
  }
  return staff;
}

export async function can(staff: Staff, resource: string, action: Action) {
  const { data } = await admin().rpc('has_permission', {
    p_user: staff.userId, p_resource: resource, p_action: action, p_product: null,
  });
  return data === true;
}
