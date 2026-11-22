'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { requirePermission, requireStaff } from '@/lib/cc/authz';
import { run, ok, clean, audit, must, type State } from '@/lib/cc/kit';

const uuid = z.string().uuid();
const refresh = () => revalidatePath('/command-center/team');
const ROLE_KEY = z.string().regex(/^[a-z_0-9]{2,50}$/);

async function scopeId(slug?: string) {
  if (!slug) return null;
  const { data } = await admin().from('org_units').select('id').eq('slug', slug).maybeSingle();
  if (!data) throw new Error('That department or unit does not exist.');
  return data.id as string;
}

export async function inviteStaff(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ email: z.string().email(), full_name: z.string().min(2).max(100), designation: z.string().max(80).optional(), role_key: ROLE_KEY, scope: z.string().optional() }).parse(clean(fd));
    const s = await requirePermission('roles', 'edit'); await requirePermission('team', 'create');
    const db = admin();
    const role = must(await db.from('roles').select('privileged').eq('key', v.role_key).single());
    if (role.privileged && !s.roles.includes('ceo')) throw new Error('Only the Founder and CEO can invite someone into a privileged role.');
    const scope = await scopeId(v.scope);
    const inv = await db.auth.admin.inviteUserByEmail(v.email);
    if (inv.error || !inv.data.user) throw new Error('Could not send the invitation. Check the email address.');
    const uid = inv.data.user.id;
    must(await db.from('staff_members').insert({ user_id: uid, full_name: v.full_name, designation: v.designation ?? null, status: 'invited' }).select('user_id').single());
    const g = await db.rpc('grant_role', { p_actor: s.userId, p_user: uid, p_role_key: v.role_key, p_scope: scope });
    if (g.error) throw g.error;
    await audit(s.userId, 'invite', 'staff', uid);
    refresh(); return ok('Invitation sent. Activate the account after they sign in and set up two-step verification.');
  });
}

export async function grantRole(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ user_id: uuid, role_key: ROLE_KEY, scope: z.string().optional() }).parse(clean(fd));
    const s = await requireStaff();
    const r = await admin().rpc('grant_role', { p_actor: s.userId, p_user: v.user_id, p_role_key: v.role_key, p_scope: await scopeId(v.scope) });
    if (r.error) throw r.error; refresh(); return ok('Role granted.');
  });
}

export async function revokeRole(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ user_id: uuid, role_key: ROLE_KEY, scope_id: uuid.optional() }).parse(clean(fd));
    const s = await requireStaff();
    const r = await admin().rpc('revoke_role', { p_actor: s.userId, p_user: v.user_id, p_role_key: v.role_key, p_scope: v.scope_id ?? null });
    if (r.error) throw r.error; refresh(); return ok('Role removed.');
  });
}

export async function setOverride(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ user_id: uuid, permission: z.string().regex(/^[a-z_]+:(view|create|edit|approve|export|delete)$/), effect: z.enum(['allow', 'deny']), reason: z.string().min(3).max(300), expires: z.string().optional() }).parse(clean(fd));
    const s = await requireStaff();
    const [resource, action] = v.permission.split(':');
    const r = await admin().rpc('set_override', { p_actor: s.userId, p_user: v.user_id, p_resource: resource, p_action: action, p_effect: v.effect, p_reason: v.reason, p_expires: v.expires ? new Date(v.expires).toISOString() : null });
    if (r.error) throw r.error; refresh(); return ok('Override saved.');
  });
}

export async function removeOverride(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const id = uuid.parse(fd.get('id'));
    const s = await requirePermission('roles', 'edit');
    const db = admin();
    const o = must(await db.from('user_permission_overrides').select('user_id').eq('id', id).single());
    if (o.user_id === s.userId) throw new Error('You cannot change your own permissions.');
    await db.from('user_permission_overrides').delete().eq('id', id);
    await audit(s.userId, 'permission_override_removed', 'staff_member', o.user_id);
    refresh(); return ok('Override removed.');
  });
}

export async function setStaffStatus(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ user_id: uuid, status: z.enum(['active', 'deactivated']), reason: z.string().max(300).optional() }).parse(clean(fd));
    const s = await requireStaff();
    const db = admin();
    const r = await db.rpc('set_staff_status', { p_actor: s.userId, p_user: v.user_id, p_status: v.status, p_reason: v.reason ?? null });
    if (r.error) throw r.error;
    if (v.status === 'deactivated') await db.auth.admin.signOut(v.user_id, 'global').catch(() => {});      // revoke every session immediately
    refresh(); return ok(v.status === 'active' ? 'Account activated.' : 'Account deactivated and signed out everywhere.');
  });
}

export async function createCustomRole(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ key: z.string().regex(/^[a-z0-9_]{2,40}$/, 'letters, numbers and underscores only'), name: z.string().min(2).max(60), description: z.string().max(200).optional() }).parse(clean(fd));
    const perms = fd.getAll('perm').map(String).filter((p) => /^[a-z_]+:(view|create|edit|approve|export|delete)$/.test(p));
    if (perms.length === 0) throw new Error('Choose at least one permission.');
    const s = await requireStaff();
    const r = await admin().rpc('create_custom_role', { p_actor: s.userId, p_key: `custom_${v.key}`, p_name: v.name, p_description: v.description ?? '', p_permissions: perms });
    if (r.error) throw r.error; refresh(); return ok('Custom role created.');
  });
}
