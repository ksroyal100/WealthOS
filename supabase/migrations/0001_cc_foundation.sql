-- WealthOS Command Center: Phase 1 foundation. ADDITIVE ONLY. Touches nothing in public.*
create schema if not exists cc;
revoke all on schema cc from public, anon, authenticated;
grant usage on schema cc to service_role;

create table cc.staff_members (
  user_id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null,
  designation text,
  department text,
  status text not null default 'invited' check (status in ('invited','active','deactivated')),
  mfa_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table cc.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  privileged boolean not null default false
);

create table cc.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null check (action in ('view','create','edit','approve','export','delete')),
  unique (resource, action)
);

create table cc.role_permissions (
  role_id uuid references cc.roles(id) on delete cascade,
  permission_id uuid references cc.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table cc.staff_roles (
  user_id uuid references cc.staff_members(user_id) on delete cascade,
  role_id uuid references cc.roles(id) on delete cascade,
  granted_by uuid references auth.users(id),
  primary key (user_id, role_id)
);

create table cc.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  category text,
  owner_id uuid references cc.staff_members(user_id),
  status text not null default 'active' check (status in ('planned','development','active','paused','retired')),
  website_url text,
  app_url text,
  created_at timestamptz not null default now()
);

create table cc.product_members (
  product_id uuid references cc.products(id) on delete cascade,
  user_id uuid references cc.staff_members(user_id) on delete cascade,
  role_id uuid references cc.roles(id),
  primary key (product_id, user_id)
);

create table cc.data_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references cc.products(id) on delete cascade,
  kind text not null,
  status text not null default 'disconnected' check (status in ('connected','stale','disconnected','error')),
  last_synced_at timestamptz,
  unique (product_id, kind)
);

create table cc.approval_limits (
  user_id uuid references cc.staff_members(user_id) on delete cascade,
  currency char(3) not null,
  max_amount numeric(14,2) not null check (max_amount >= 0),
  primary key (user_id, currency)
);

create table cc.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  resource text not null,
  record_id text,
  outcome text not null check (outcome in ('success','denied','approved','rejected','error')),
  meta jsonb not null default '{}'::jsonb
);

create function cc.audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_no_update before update or delete on cc.audit_log
  for each row execute function cc.audit_immutable();
create trigger audit_no_truncate before truncate on cc.audit_log
  for each statement execute function cc.audit_immutable();

create function cc.has_permission(p_user uuid, p_resource text, p_action text, p_product uuid default null)
returns boolean language sql stable security definer set search_path = cc, pg_temp as $$
  select exists (
    select 1
    from staff_members s
    join staff_roles sr on sr.user_id = s.user_id
    join role_permissions rp on rp.role_id = sr.role_id
    join permissions p on p.id = rp.permission_id
    where s.user_id = p_user and s.status = 'active'
      and p.resource = p_resource and p.action = p_action
  ) or (p_product is not null and exists (
    select 1
    from staff_members s
    join product_members pm on pm.user_id = s.user_id and pm.product_id = p_product
    join role_permissions rp on rp.role_id = pm.role_id
    join permissions p on p.id = rp.permission_id
    where s.user_id = p_user and s.status = 'active'
      and p.resource = p_resource and p.action = p_action
  ));
$$;
revoke all on function cc.has_permission from public, anon, authenticated;
grant execute on function cc.has_permission to service_role;

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='cc' loop
    execute format('alter table cc.%I enable row level security', t);
    execute format('revoke all on cc.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on cc.%I to service_role', t);
  end loop; end $$;
revoke update, delete, truncate on cc.audit_log from service_role;
grant usage, select on all sequences in schema cc to service_role;

insert into cc.roles (key, name, privileged) values
 ('ceo','Founder & CEO',true),('cfo','CFO',true),('product_manager','Product Manager',false),
 ('developer','Developer',false),('media_manager','Media Manager / Editor',false);

insert into cc.permissions (resource, action)
select r, a from unnest(array['dashboard','finance','banking','products','media','projects','tasks','team','reports','security','audit']) r,
                 unnest(array['view','create','edit','approve','export','delete']) a;

insert into cc.role_permissions select r.id, p.id from cc.roles r, cc.permissions p where r.key='ceo';
insert into cc.role_permissions select r.id, p.id from cc.roles r, cc.permissions p
 where r.key='cfo' and (p.resource in ('finance','banking','reports') or (p.resource in ('dashboard','projects','tasks') and p.action='view'));
insert into cc.role_permissions select r.id, p.id from cc.roles r, cc.permissions p
 where r.key='product_manager' and ((p.resource in ('products','projects','tasks','reports') and p.action in ('view','create','edit','export')) or (p.resource='dashboard' and p.action='view'));
insert into cc.role_permissions select r.id, p.id from cc.roles r, cc.permissions p
 where r.key='developer' and ((p.resource in ('projects','tasks') and p.action in ('view','create','edit')) or (p.resource in ('products','dashboard') and p.action='view'));
insert into cc.role_permissions select r.id, p.id from cc.roles r, cc.permissions p
 where r.key='media_manager' and ((p.resource in ('media','projects','tasks') and p.action in ('view','create','edit','approve')) or (p.resource='dashboard' and p.action='view'));

insert into cc.products (slug, name, description, category, status)
values ('finora','Finora','Your Personal Finance Management Platform','Personal finance','active');
insert into cc.data_sources (product_id, kind, status)
select id, 'finora_metrics', 'disconnected' from cc.products where slug='finora';
