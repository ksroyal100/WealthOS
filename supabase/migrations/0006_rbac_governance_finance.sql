-- Phase 2-3: full role set, scoped and user-specific permissions, safe role administration,
-- multi-level approvals, FX conversion policy, AR/AP aging, annual reports. ADDITIVE ONLY.

-- ---------- roles ----------
alter table cc.roles add column if not exists is_custom boolean not null default false,
                     add column if not exists description text,
                     add column if not exists created_by uuid references auth.users(id);
insert into cc.roles (key, name, privileged, description) values
 ('cto','CTO',true,'Technology leadership'),('coo','COO',true,'Operations leadership'),('cmo','CMO',false,'Marketing and media leadership'),
 ('hr_manager','HR Manager',false,'People operations'),('department_manager','Department Manager',false,'Manages a department (scope it to a unit)'),
 ('finance_staff','Finance Staff',false,'Finance operations without approval rights'),('auditor','Auditor',false,'Read-only oversight');
update cc.roles set privileged = true where key in ('ceo','cfo','cto','coo');

-- A role can be scoped to an organization unit (and its children). NULL scope = company-wide.
alter table cc.staff_roles add column if not exists scope_org_unit_id uuid references cc.org_units(id);
alter table cc.staff_roles drop constraint if exists staff_roles_pkey;
create unique index if not exists staff_roles_unique on cc.staff_roles (user_id, role_id, coalesce(scope_org_unit_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------- permissions for the new modules ----------
insert into cc.permissions (resource, action)
select r, a from unnest(array['hr','hr_sensitive','crm','legal','legal_confidential','engineering','support','marketing','fx','roles']) r,
                 unnest(array['view','create','edit','approve','export','delete']) a;

do $$ declare g record; begin
  for g in select * from (values
    ('ceo', array['hr','hr_sensitive','crm','legal','legal_confidential','engineering','support','marketing','fx','roles'], array['view','create','edit','approve','export','delete']),
    ('cfo', array['fx'], array['view','create','edit','approve','export','delete']),
    ('cfo', array['legal'], array['view','export']),
    ('cto', array['engineering'], array['view','create','edit','approve','export','delete']),
    ('cto', array['products','projects','tasks'], array['view','create','edit','approve','export']),
    ('cto', array['dashboard','reports','support'], array['view','export']),
    ('coo', array['projects','tasks','crm','support'], array['view','create','edit','approve','export']),
    ('coo', array['engineering','hr','legal','marketing','dashboard','org','leadership'], array['view']),
    ('coo', array['reports'], array['view','export']),
    ('cmo', array['marketing','media'], array['view','create','edit','approve','export']),
    ('cmo', array['cms'], array['view','create','edit','approve']),
    ('cmo', array['crm','dashboard','reports'], array['view']),
    ('hr_manager', array['hr'], array['view','create','edit','approve','export','delete']),
    ('hr_manager', array['hr_sensitive'], array['view','create','edit','export']),
    ('hr_manager', array['legal','team','dashboard','org','leadership'], array['view']),
    ('department_manager', array['projects','tasks'], array['view','create','edit']),
    ('department_manager', array['dashboard','reports','org'], array['view']),
    ('finance_staff', array['finance'], array['view','create','edit','export']),
    ('finance_staff', array['fx','reports','dashboard'], array['view']),
    ('auditor', array['finance','legal','reports','audit'], array['view','export']),
    ('auditor', array['fx','security','hr','team','org','leadership','roles','crm','engineering','support','dashboard'], array['view']),
    ('developer', array['engineering'], array['view','create','edit']),
    ('product_manager', array['engineering'], array['view','create','edit']),
    ('product_manager', array['support'], array['view']),
    ('media_manager', array['marketing'], array['view','create','edit'])
  ) as v(role_key, res, acts) loop
    insert into cc.role_permissions (role_id, permission_id)
    select r.id, p.id from cc.roles r, cc.permissions p where r.key = g.role_key and p.resource = any(g.res) and p.action = any(g.acts)
    on conflict do nothing;
  end loop;
end $$;

-- ---------- user-specific overrides (justified, expiring, audited) ----------
create table cc.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references cc.staff_members(user_id) on delete cascade,
  permission_id uuid not null references cc.permissions(id),
  effect text not null check (effect in ('allow','deny')),
  reason text not null check (length(trim(reason)) > 0),
  granted_by uuid not null references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, permission_id),
  check (granted_by <> user_id)
);

-- Company-wide check. A deny override beats everything. Scoped role assignments do not count here.
create or replace function cc.has_permission(p_user uuid, p_resource text, p_action text, p_product uuid default null)
returns boolean language sql stable security definer set search_path = cc, pg_temp as $$
  select case
    when not exists (select 1 from staff_members s where s.user_id = p_user and s.status = 'active') then false
    when exists (select 1 from user_permission_overrides o join permissions p on p.id = o.permission_id
                 where o.user_id = p_user and p.resource = p_resource and p.action = p_action and o.effect = 'deny' and (o.expires_at is null or o.expires_at > now())) then false
    else (
      exists (select 1 from staff_roles sr join role_permissions rp on rp.role_id = sr.role_id join permissions p on p.id = rp.permission_id
              where sr.user_id = p_user and sr.scope_org_unit_id is null and p.resource = p_resource and p.action = p_action)
      or exists (select 1 from user_permission_overrides o join permissions p on p.id = o.permission_id
                 where o.user_id = p_user and p.resource = p_resource and p.action = p_action and o.effect = 'allow' and (o.expires_at is null or o.expires_at > now()))
      or (p_product is not null and exists (select 1 from product_members pm join role_permissions rp on rp.role_id = pm.role_id join permissions p on p.id = rp.permission_id
                 where pm.user_id = p_user and pm.product_id = p_product and p.resource = p_resource and p.action = p_action))
    ) end;
$$;

-- Department-level check: company-wide permission, or a role scoped to this unit or one of its ancestors.
create function cc.has_permission_in_unit(p_user uuid, p_resource text, p_action text, p_unit uuid)
returns boolean language sql stable security definer set search_path = cc, pg_temp as $$
  select cc.has_permission(p_user, p_resource, p_action)
      or (
        exists (select 1 from staff_members s where s.user_id = p_user and s.status = 'active')
        and not exists (select 1 from user_permission_overrides o join permissions p on p.id = o.permission_id
                        where o.user_id = p_user and p.resource = p_resource and p.action = p_action and o.effect = 'deny' and (o.expires_at is null or o.expires_at > now()))
        and exists (
          with recursive anc as (select id, parent_id from org_units where id = p_unit union all select o.id, o.parent_id from org_units o join anc on o.id = anc.parent_id)
          select 1 from staff_roles sr join role_permissions rp on rp.role_id = sr.role_id join permissions p on p.id = rp.permission_id
          where sr.user_id = p_user and sr.scope_org_unit_id in (select id from anc) and p.resource = p_resource and p.action = p_action)
      );
$$;

-- ---------- safe role administration (no one can raise their own privileges) ----------
create function cc.is_ceo(p_user uuid) returns boolean language sql stable security definer set search_path = cc, pg_temp as $$
  select exists (select 1 from staff_roles sr join roles r on r.id = sr.role_id join staff_members s on s.user_id = sr.user_id
                 where sr.user_id = p_user and r.key = 'ceo' and sr.scope_org_unit_id is null and s.status = 'active') $$;

create function cc.holds_all_permissions(p_user uuid, p_role_id uuid) returns boolean language sql stable security definer set search_path = cc, pg_temp as $$
  select not exists (select 1 from role_permissions rp join permissions p on p.id = rp.permission_id
                     where rp.role_id = p_role_id and not cc.has_permission(p_user, p.resource, p.action)) $$;

create function cc.grant_role(p_actor uuid, p_user uuid, p_role_key text, p_scope uuid default null) returns void
language plpgsql security definer set search_path = cc, pg_temp as $$
declare r roles%rowtype;
begin
  if not has_permission(p_actor, 'roles', 'edit') then raise exception 'not permitted'; end if;
  if p_actor = p_user then raise exception 'you cannot change your own roles'; end if;
  if not exists (select 1 from staff_members where user_id = p_user) then raise exception 'unknown staff member'; end if;
  select * into r from roles where key = p_role_key; if not found then raise exception 'unknown role'; end if;
  if r.privileged and not is_ceo(p_actor) then raise exception 'only the Founder and CEO can grant privileged roles'; end if;
  if not is_ceo(p_actor) and not holds_all_permissions(p_actor, r.id) then raise exception 'you cannot grant permissions you do not hold'; end if;
  insert into staff_roles (user_id, role_id, granted_by, scope_org_unit_id) values (p_user, r.id, p_actor, p_scope) on conflict do nothing;
end $$;

create function cc.revoke_role(p_actor uuid, p_user uuid, p_role_key text, p_scope uuid default null) returns void
language plpgsql security definer set search_path = cc, pg_temp as $$
declare r roles%rowtype;
begin
  if not has_permission(p_actor, 'roles', 'edit') then raise exception 'not permitted'; end if;
  select * into r from roles where key = p_role_key; if not found then raise exception 'unknown role'; end if;
  if r.privileged and not is_ceo(p_actor) then raise exception 'only the Founder and CEO can revoke privileged roles'; end if;
  if r.key = 'ceo' and (select count(*) from staff_roles sr join staff_members s on s.user_id = sr.user_id where sr.role_id = r.id and s.status = 'active' and sr.user_id <> p_user) = 0 then
    raise exception 'the last active Founder and CEO cannot be removed';
  end if;
  delete from staff_roles where user_id = p_user and role_id = r.id and scope_org_unit_id is not distinct from p_scope;
end $$;

create function cc.set_override(p_actor uuid, p_user uuid, p_resource text, p_action text, p_effect text, p_reason text, p_expires timestamptz default null) returns void
language plpgsql security definer set search_path = cc, pg_temp as $$
declare perm uuid;
begin
  if not has_permission(p_actor, 'roles', 'edit') then raise exception 'not permitted'; end if;
  if p_actor = p_user then raise exception 'you cannot change your own permissions'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'a reason is required'; end if;
  select id into perm from permissions where resource = p_resource and action = p_action; if perm is null then raise exception 'unknown permission'; end if;
  if p_effect = 'allow' and not is_ceo(p_actor) and not has_permission(p_actor, p_resource, p_action) then raise exception 'you cannot grant a permission you do not hold'; end if;
  insert into user_permission_overrides (user_id, permission_id, effect, reason, granted_by, expires_at) values (p_user, perm, p_effect, p_reason, p_actor, p_expires)
  on conflict (user_id, permission_id) do update set effect = excluded.effect, reason = excluded.reason, granted_by = excluded.granted_by, expires_at = excluded.expires_at, created_at = now();
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta) values (p_actor, 'permission_override', 'staff_member', p_user::text, 'success', jsonb_build_object('permission', p_resource || ':' || p_action, 'effect', p_effect, 'reason', p_reason, 'expires_at', p_expires));
end $$;

create function cc.set_staff_status(p_actor uuid, p_user uuid, p_status text, p_reason text default null) returns void
language plpgsql security definer set search_path = cc, pg_temp as $$
begin
  if p_status not in ('active','deactivated') then raise exception 'invalid status'; end if;
  if not has_permission(p_actor, 'team', 'edit') then raise exception 'not permitted'; end if;
  if p_actor = p_user then raise exception 'you cannot change your own account status'; end if;
  if p_status = 'deactivated' then
    if is_ceo(p_user) and (select count(*) from staff_roles sr join roles r on r.id = sr.role_id join staff_members s on s.user_id = sr.user_id where r.key = 'ceo' and s.status = 'active' and sr.user_id <> p_user) = 0 then
      raise exception 'the last active Founder and CEO cannot be deactivated'; end if;
    if is_ceo(p_user) and not is_ceo(p_actor) then raise exception 'only the Founder and CEO can deactivate a CEO'; end if;
  end if;
  update staff_members set status = p_status where user_id = p_user;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta) values (p_actor, case p_status when 'active' then 'activate' else 'deactivate' end, 'staff_member', p_user::text, 'success', jsonb_build_object('reason', p_reason));
end $$;

create function cc.create_custom_role(p_actor uuid, p_key text, p_name text, p_description text, p_permissions text[]) returns uuid
language plpgsql security definer set search_path = cc, pg_temp as $$
declare rid uuid; pr text; perm uuid;
begin
  if not has_permission(p_actor, 'roles', 'create') then raise exception 'not permitted'; end if;
  if p_key !~ '^custom_[a-z0-9_]{2,40}$' then raise exception 'custom role keys look like custom_name'; end if;
  insert into roles (key, name, privileged, is_custom, description, created_by) values (p_key, p_name, false, true, p_description, p_actor) returning id into rid;
  foreach pr in array p_permissions loop
    select id into perm from permissions where resource = split_part(pr, ':', 1) and action = split_part(pr, ':', 2);
    if perm is null then raise exception 'unknown permission %', pr; end if;
    if not is_ceo(p_actor) and not has_permission(p_actor, split_part(pr, ':', 1), split_part(pr, ':', 2)) then raise exception 'you cannot include permissions you do not hold (%)', pr; end if;
    insert into role_permissions (role_id, permission_id) values (rid, perm);
  end loop;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta) values (p_actor, 'create', 'role', rid::text, 'success', jsonb_build_object('key', p_key, 'permissions', p_permissions));
  return rid;
end $$;

-- ---------- multi-level approvals ----------
alter table cc.approvals add column if not exists required_levels integer not null default 1 check (required_levels between 1 and 5);
create table cc.approval_policies (
  id uuid primary key default gen_random_uuid(),
  kind text not null default '*', currency char(3) not null,
  min_amount numeric(14,2) not null check (min_amount >= 0),
  required_levels integer not null check (required_levels between 1 and 5),
  unique (kind, currency, min_amount)
);
create table cc.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references cc.approvals(id) on delete restrict,
  level integer not null, decided_by uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','rejected')), reason text, at timestamptz not null default now(),
  unique (approval_id, level), unique (approval_id, decided_by)           -- one person cannot supply two levels
);
create trigger approval_decisions_no_change before update or delete on cc.approval_decisions for each row execute function cc.revision_immutable();

create function cc.request_approval(p_user uuid, p_kind text, p_subject text, p_amount numeric, p_currency char(3)) returns uuid
language plpgsql security definer set search_path = cc, pg_temp as $$
declare lv int; v_id uuid;
begin
  if not has_permission(p_user, 'finance', 'create') then raise exception 'not permitted'; end if;
  select coalesce(max(required_levels), 1) into lv from approval_policies where kind in (p_kind, '*') and currency = p_currency and min_amount <= p_amount;
  insert into approvals (kind, subject, amount, currency, requested_by, required_levels) values (p_kind, p_subject, p_amount, p_currency, p_user, lv) returning id into v_id;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta) values (p_user, 'request', 'approval', v_id::text, 'success', jsonb_build_object('levels', lv));
  return v_id;
end $$;

create or replace function cc.decide_approval(p_id uuid, p_user uuid, p_decision text, p_reason text default null) returns void
language plpgsql security definer set search_path = cc, pg_temp as $$
declare a approvals%rowtype; lim numeric; lvl int;
begin
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  select * into a from approvals where id = p_id for update;
  if not found or a.status <> 'pending' then raise exception 'approval not pending'; end if;
  if a.requested_by = p_user then raise exception 'cannot decide own request'; end if;
  if not has_permission(p_user, 'finance', 'approve') then raise exception 'not permitted'; end if;
  if exists (select 1 from approval_decisions where approval_id = p_id and decided_by = p_user) then raise exception 'you have already decided this request'; end if;
  if p_decision = 'rejected' and (p_reason is null or length(trim(p_reason)) = 0) then raise exception 'a rejection reason is required'; end if;
  if p_decision = 'approved' and a.amount is not null then
    select max_amount into lim from approval_limits where user_id = p_user and currency = a.currency;
    if lim is null or a.amount > lim then raise exception 'amount exceeds approval limit'; end if;
  end if;
  lvl := (select count(*) from approval_decisions where approval_id = p_id and decision = 'approved') + 1;
  insert into approval_decisions (approval_id, level, decided_by, decision, reason) values (p_id, lvl, p_user, p_decision, p_reason);
  if p_decision = 'rejected' then
    update approvals set status = 'rejected', decided_by = p_user, decided_at = now(), reason = p_reason where id = p_id;
  elsif lvl >= a.required_levels then
    update approvals set status = 'approved', decided_by = p_user, decided_at = now(), reason = p_reason where id = p_id;
  end if;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta)
  values (p_user, 'decide', 'approval', p_id::text, p_decision, jsonb_build_object('kind', a.kind, 'level', lvl, 'of', a.required_levels));
end $$;

-- ---------- FX: currencies are never combined without a documented rate ----------
create table cc.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base char(3) not null, quote char(3) not null check (base <> quote),
  rate numeric(18,8) not null check (rate > 0), as_of date not null,
  source text not null check (length(trim(source)) > 0),
  recorded_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique (base, quote, as_of)
);
create function cc.consolidate(p_target char(3), p_month date)
returns table (currency char(3), net numeric, rate numeric, rate_as_of date, rate_source text, converted numeric, status text)
language sql stable security definer set search_path = cc, pg_temp as $$
  with m as (
    select l.currency,
      coalesce(sum(l.amount) filter (where l.kind = 'revenue' and l.status = 'received'), 0)
      - coalesce(sum(l.amount) filter (where l.kind = 'refund' and l.status in ('received','paid')), 0)
      - coalesce(sum(l.amount) filter (where l.kind = 'fee' and l.status in ('received','paid')), 0)
      - coalesce(sum(l.amount) filter (where l.kind = 'expense' and l.status = 'paid'), 0) as net
    from ledger_entries l where date_trunc('month', l.occurred_on) = date_trunc('month', p_month) group by l.currency)
  select m.currency, m.net, fx.rate, fx.as_of, fx.source,
         case when m.currency = p_target then m.net else round(m.net * fx.rate, 2) end,
         case when m.currency = p_target then 'native' when fx.rate is null then 'missing_rate' else 'converted' end
  from m left join lateral (select f.rate, f.as_of, f.source from fx_rates f where f.base = m.currency and f.quote = p_target and f.as_of <= (date_trunc('month', p_month) + interval '1 month - 1 day')::date order by f.as_of desc limit 1) fx on true;
$$;

create view cc.v_ar_ap_aging with (security_invoker = true) as
select direction, currency,
  coalesce(sum(amount) filter (where due_on is null or due_on >= current_date), 0) as current_amount,
  coalesce(sum(amount) filter (where due_on < current_date and due_on >= current_date - 30), 0) as days_1_30,
  coalesce(sum(amount) filter (where due_on < current_date - 30 and due_on >= current_date - 60), 0) as days_31_60,
  coalesce(sum(amount) filter (where due_on < current_date - 60 and due_on >= current_date - 90), 0) as days_61_90,
  coalesce(sum(amount) filter (where due_on < current_date - 90), 0) as over_90,
  coalesce(sum(amount), 0) as total_open
from cc.invoices where status = 'open' group by direction, currency;

alter table cc.vendors add column if not exists status text not null default 'active' check (status in ('active','inactive')), add column if not exists notes text;

-- ---------- annual reports; critical alerts notify the CEO ----------
alter table cc.reports drop constraint if exists reports_kind_check;
alter table cc.reports add constraint reports_kind_check check (kind in ('daily','weekly','monthly','annual'));
alter table cc.report_schedules drop constraint if exists report_schedules_kind_check;
alter table cc.report_schedules add constraint report_schedules_kind_check check (kind in ('daily','weekly','monthly','annual'));
insert into cc.report_schedules (kind) values ('annual') on conflict do nothing;

create function cc.notify_critical_alert() returns trigger language plpgsql security definer set search_path = cc, pg_temp as $$
begin
  if new.severity = 'critical' then
    insert into notifications (user_id, title, body)
    select distinct sr.user_id, 'Critical alert', new.message from staff_roles sr join roles r on r.id = sr.role_id join staff_members s on s.user_id = sr.user_id
    where r.key = 'ceo' and s.status = 'active' and sr.scope_org_unit_id is null;
  end if;
  return new;
end $$;
create trigger alerts_notify_critical after insert on cc.alerts for each row execute function cc.notify_critical_alert();

-- ---------- lock down ----------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'cc' loop
    execute format('alter table cc.%I enable row level security', t);
    execute format('revoke all on cc.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on cc.%I to service_role', t);
  end loop; end $$;
revoke update, delete, truncate on cc.audit_log from service_role;
revoke update, delete, truncate on cc.cms_revisions from service_role;
revoke delete on cc.cms_documents from service_role;
revoke update, delete, truncate on cc.approval_decisions from service_role;
revoke all on cc.v_ar_ap_aging from anon, authenticated; grant select on cc.v_ar_ap_aging to service_role;
revoke all on function cc.grant_role, cc.revoke_role, cc.set_override, cc.set_staff_status, cc.create_custom_role, cc.request_approval, cc.decide_approval, cc.consolidate, cc.has_permission_in_unit, cc.is_ceo, cc.holds_all_permissions from public, anon, authenticated;
grant execute on function cc.grant_role, cc.revoke_role, cc.set_override, cc.set_staff_status, cc.create_custom_role, cc.request_approval, cc.decide_approval, cc.consolidate, cc.has_permission_in_unit, cc.is_ceo, cc.holds_all_permissions to service_role;
grant usage, select on all sequences in schema cc to service_role;
