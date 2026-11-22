import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import ConfirmForm from '@/components/cc/confirm-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, fmtDateTime } from '@/components/cc/kit';
import { inviteStaff, grantRole, revokeRole, setOverride, removeOverride, setStaffStatus, createCustomRole } from '@/lib/cc/actions-rbac';

export const metadata = { title: 'Access and team' };

export default async function Team() {
  const staff = await requirePermission('team', 'view');
  const db = admin();
  const [{ data: members }, { data: roles }, { data: perms }, { data: units }, { data: overrides }, { data: history }, canRoles, canStatus, canCreate, canCreateRole] = await Promise.all([
    db.from('staff_members').select('user_id,full_name,designation,status,staff_roles(role_id,scope_org_unit_id,roles(key,name,privileged))').order('full_name'),
    db.from('roles').select('id,key,name,privileged,is_custom').order('name'), db.from('permissions').select('resource,action').order('resource').order('action'),
    db.from('org_units').select('id,slug,name').order('name'), db.from('user_permission_overrides').select('id,user_id,effect,reason,expires_at,permissions(resource,action)').order('created_at', { ascending: false }),
    db.from('audit_log').select('id,at,actor_id,action,record_id,meta').in('action', ['role_grant', 'role_revoke', 'permission_override', 'permission_override_removed', 'activate', 'deactivate', 'invite']).order('id', { ascending: false }).limit(40),
    can(staff, 'roles', 'edit'), can(staff, 'team', 'edit'), can(staff, 'team', 'create'), can(staff, 'roles', 'create')]);
  const ceo = staff.roles.includes('ceo');
  const grantable = (roles ?? []).filter((r: any) => ceo || !r.privileged);
  const nm = (id: string | null) => (members ?? []).find((m: any) => m.user_id === id)?.full_name ?? (id ? 'Unknown' : 'System');
  const unitName = (id: string | null) => (units ?? []).find((u: any) => u.id === id)?.name;
  const groups: Record<string, string[]> = {}; for (const p of (perms ?? []) as any[]) (groups[p.resource] ??= []).push(p.action);
  const RoleFields = () => (<><F label="Role"><select name="role_key" className={inp}>{grantable.map((r: any) => <option key={r.key} value={r.key}>{r.name}{r.is_custom ? ' (custom)' : ''}</option>)}</select></F>
    <F label="Limit to a department (optional)"><select name="scope" className={inp}><option value="">Company-wide</option>{(units ?? []).map((u: any) => <option key={u.slug} value={u.slug}>{u.name}</option>)}</select></F></>);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Access and team" desc="Who can do what. Role changes are checked by the database: nobody can change their own access, only the Founder and CEO can grant privileged roles, no one can grant a permission they do not hold, and the last Founder and CEO cannot be removed. Every change is recorded below." />
      <Table caption="Staff" head={['Name', 'Status', 'Roles', 'Actions']} empty={(members ?? []).length === 0}>
        {(members ?? []).map((m: any) => (
          <tr key={m.user_id}><Td><b>{m.full_name}</b><div className="text-xs text-slate-600">{m.designation}</div></Td><Td><Pill tone={toneFor(m.status === 'deactivated' ? 'rejected' : m.status)}>{m.status}</Pill></Td>
            <Td>{(m.staff_roles ?? []).length === 0 && <span className="text-slate-500">none</span>}<ul className="space-y-1">{(m.staff_roles ?? []).map((r: any) => (<li key={r.role_id + (r.scope_org_unit_id ?? '')} className="flex flex-wrap items-center gap-2">{r.roles.name}{r.scope_org_unit_id && <span className="text-xs text-slate-600">in {unitName(r.scope_org_unit_id)}</span>}{r.roles.privileged && <Pill tone="warn">privileged</Pill>}
              {canRoles && m.user_id !== staff.userId && (ceo || !r.roles.privileged) && <ConfirmForm action={revokeRole} hidden={{ user_id: m.user_id, role_key: r.roles.key, ...(r.scope_org_unit_id ? { scope_id: r.scope_org_unit_id } : {}) }} label="Remove" title={`Remove ${r.roles.name}?`} message={`${m.full_name} will lose this role immediately.`} />}</li>))}</ul></Td>
            <Td className="space-y-2">{m.user_id === staff.userId ? <span className="text-xs text-slate-500">This is you</span> : <>
              {canRoles && <details><summary className="cursor-pointer text-xs underline">Grant a role</summary><div className="mt-2 w-72"><ActionForm action={grantRole} submit="Grant" className="grid gap-2"><input type="hidden" name="user_id" value={m.user_id} /><RoleFields /></ActionForm></div></details>}
              {canStatus && (m.status === 'active' ? <ConfirmForm action={setStaffStatus} hidden={{ user_id: m.user_id, status: 'deactivated' }} label="Deactivate" title={`Deactivate ${m.full_name}?`} message="They lose all access and are signed out of every device immediately. You can reactivate them later." />
                : <ConfirmForm action={setStaffStatus} hidden={{ user_id: m.user_id, status: 'active' }} label="Activate" danger={false} title={`Activate ${m.full_name}?`} message="Only activate after they have signed in and turned on two-step verification." />)}</>}</Td></tr>))}
      </Table>

      {canCreate && canRoles && <div className="mt-6"><Section title="Invite a team member"><ActionForm action={inviteStaff} submit="Send invitation"><F label="Work email"><input required type="email" name="email" className={inp} /></F><F label="Full name"><input required name="full_name" className={inp} /></F><F label="Designation"><input name="designation" className={inp} /></F><RoleFields /></ActionForm></Section></div>}

      <Section title="Individual permission overrides">
        <p className="mb-3 text-sm text-slate-600">For exceptions only. A deny always wins. Every override needs a reason and can expire.</p>
        <ul className="mb-4 divide-y text-sm">{(overrides ?? []).length === 0 && <li className="py-2 text-slate-500">No overrides.</li>}{(overrides ?? []).map((o: any) => (<li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{nm(o.user_id)}</b>: {o.effect} {o.permissions.resource}:{o.permissions.action} <span className="text-slate-600">({o.reason}{o.expires_at ? `, until ${fmtDateTime(o.expires_at)}` : ''})</span></span>{canRoles && o.user_id !== staff.userId && <ConfirmForm action={removeOverride} hidden={{ id: o.id }} label="Remove" title="Remove this override?" message="The person's normal role permissions apply again." />}</li>))}</ul>
        {canRoles && <ActionForm action={setOverride} submit="Save override"><F label="Person"><select name="user_id" className={inp}>{(members ?? []).filter((m: any) => m.user_id !== staff.userId).map((m: any) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}</select></F>
          <F label="Permission"><select name="permission" className={inp}>{Object.entries(groups).flatMap(([r, a]) => a.map((x) => <option key={r + x} value={`${r}:${x}`}>{r}:{x}</option>))}</select></F><F label="Effect"><select name="effect" className={inp}><option value="allow">Allow</option><option value="deny">Deny</option></select></F>
          <F label="Reason (required)" span={2}><input required name="reason" className={inp} /></F><F label="Expires (optional)"><input type="datetime-local" name="expires" className={inp} /></F></ActionForm>}
      </Section>

      {canCreateRole && <Section title="Create a custom role"><ActionForm action={createCustomRole} submit="Create role" className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-3"><F label="Name"><input required name="name" className={inp} /></F><F label="Key (letters and numbers)"><input required name="key" pattern="[a-z0-9_]{2,40}" className={inp} /></F><F label="Description"><input name="description" className={inp} /></F></div>
        <fieldset className="grid gap-3 md:grid-cols-3"><legend className="mb-1 text-sm">Permissions (you can only include ones you hold yourself, unless you are the Founder and CEO)</legend>{Object.entries(groups).map(([r, acts]) => (<div key={r} className="rounded border p-2 text-sm"><b>{r}</b><div className="mt-1 flex flex-wrap gap-x-3">{acts.map((a) => <label key={a}><input type="checkbox" name="perm" value={`${r}:${a}`} /> {a}</label>)}</div></div>))}</fieldset></ActionForm></Section>}

      <Section title="Permission change history">
        <ul className="divide-y text-sm">{(history ?? []).length === 0 && <li className="py-2 text-slate-500">No changes recorded.</li>}{(history ?? []).map((h: any) => (<li key={h.id} className="flex flex-wrap justify-between gap-2 py-1.5"><span>{nm(h.actor_id)} · {h.action.replace(/_/g, ' ')} · {nm(h.record_id)}{h.meta?.reason ? ` · "${h.meta.reason}"` : ''}</span><span className="text-slate-600">{fmtDateTime(h.at)}</span></li>))}</ul>
      </Section>
    </div>
  );
}
