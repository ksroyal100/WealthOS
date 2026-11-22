-- Phase 2-6 schema. ADDITIVE ONLY. Money = numeric(14,2). Everything in cc is deny-by-default (RLS, service_role only).

create table cc.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table cc.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references cc.products(id),
  occurred_on date not null,
  kind text not null check (kind in ('revenue','refund','fee','expense')),
  category text not null default 'general',   -- e.g. software, infrastructure, marketing, vendor_payment
  status text not null check (status in ('estimated','pending','received','paid','failed','reversed')),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'USD',
  description text,
  vendor_id uuid references cc.vendors(id),
  source text not null default 'manual',
  external_ref text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (source, external_ref)
);
create index on cc.ledger_entries (occurred_on);
create index on cc.ledger_entries (product_id, occurred_on);

-- Actuals only: estimated/pending/failed/reversed never count as received money.
create view cc.v_monthly_financials with (security_invoker = true) as
select date_trunc('month', occurred_on)::date as month, product_id, currency,
  coalesce(sum(amount) filter (where kind='revenue' and status='received'),0)::numeric(14,2) as gross_revenue,
  coalesce(sum(amount) filter (where kind='refund'  and status in ('received','paid')),0)::numeric(14,2) as refunds,
  coalesce(sum(amount) filter (where kind='fee'     and status in ('received','paid')),0)::numeric(14,2) as fees,
  coalesce(sum(amount) filter (where kind='expense' and status='paid'),0)::numeric(14,2) as expenses,
  coalesce(sum(amount) filter (where kind='revenue' and status='received'),0)
   - coalesce(sum(amount) filter (where kind='refund' and status in ('received','paid')),0)
   - coalesce(sum(amount) filter (where kind='fee' and status in ('received','paid')),0) as net_revenue,
  coalesce(sum(amount) filter (where kind='revenue' and status='estimated'),0)::numeric(14,2) as estimated_revenue_not_received,
  count(*) filter (where status='failed') as failed_count
from cc.ledger_entries group by 1,2,3;

create table cc.budgets (
  id uuid primary key default gen_random_uuid(),
  month date not null, category text not null, product_id uuid references cc.products(id),
  amount numeric(14,2) not null check (amount >= 0), currency char(3) not null default 'USD',
  unique (month, category, product_id)
);

create table cc.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique not null, counterparty text not null, direction text not null check (direction in ('receivable','payable')),
  amount numeric(14,2) not null check (amount > 0), currency char(3) not null default 'USD',
  issued_on date not null, due_on date, status text not null default 'open' check (status in ('open','paid','void','overdue')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table cc.approvals (
  id uuid primary key default gen_random_uuid(),
  kind text not null, subject text not null, ref_table text, ref_id uuid,
  amount numeric(14,2) check (amount is null or amount >= 0), currency char(3),
  requested_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id), decided_at timestamptz, reason text,
  created_at timestamptz not null default now(),
  check (decided_by is null or decided_by <> requested_by)       -- no self-approval, enforced in the database
);

-- Decision happens in one transaction: permission, limit, separation of duties, audit.
create function cc.decide_approval(p_id uuid, p_user uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = cc, pg_temp as $$
declare a approvals%rowtype; lim numeric;
begin
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  select * into a from approvals where id = p_id for update;
  if not found or a.status <> 'pending' then raise exception 'approval not pending'; end if;
  if a.requested_by = p_user then raise exception 'cannot decide own request'; end if;
  if not has_permission(p_user, 'finance', 'approve') then raise exception 'not permitted'; end if;
  if p_decision = 'approved' and a.amount is not null then
    select max_amount into lim from approval_limits where user_id = p_user and currency = a.currency;
    if lim is null or a.amount > lim then raise exception 'amount exceeds approval limit'; end if;
  end if;
  update approvals set status = p_decision, decided_by = p_user, decided_at = now(), reason = p_reason where id = p_id;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta)
  values (p_user, 'decide', 'approval', p_id::text, p_decision, jsonb_build_object('kind', a.kind));
end $$;
revoke all on function cc.decide_approval from public, anon, authenticated;
grant execute on function cc.decide_approval to service_role;

-- Banking: integration-ready only. Nothing here connects to a bank.
create table cc.bank_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null, label text not null,
  scope text not null default 'read_only' check (scope in ('read_only')),   -- write scope intentionally not representable yet
  status text not null default 'not_configured' check (status in ('not_configured','connected','error','revoked')),
  last_synced_at timestamptz, created_at timestamptz not null default now()
);
create table cc.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references cc.bank_connections(id),
  external_id text not null, posted_on date not null, direction text not null check (direction in ('in','out')),
  amount numeric(14,2) not null check (amount > 0), currency char(3) not null, description text,
  matched_ledger_id uuid references cc.ledger_entries(id),
  unique (connection_id, external_id)
);

create table cc.product_metrics_daily (
  product_id uuid not null references cc.products(id), day date not null,
  total_users integer check (total_users >= 0), active_users integer check (active_users >= 0),
  new_registrations integer check (new_registrations >= 0), active_subscriptions integer check (active_subscriptions >= 0),
  cancellations integer check (cancellations >= 0), mrr numeric(14,2) check (mrr >= 0), currency char(3) default 'USD',
  health text check (health in ('healthy','degraded','down')), usage jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  primary key (product_id, day)
);

create table cc.projects (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  product_id uuid references cc.products(id), owner_id uuid references cc.staff_members(user_id),
  status text not null default 'active' check (status in ('planned','active','on_hold','done')),
  due_on date, created_at timestamptz not null default now()
);
create table cc.project_members (
  project_id uuid references cc.projects(id) on delete cascade,
  user_id uuid references cc.staff_members(user_id) on delete cascade,
  primary key (project_id, user_id)
);
create table cc.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references cc.projects(id) on delete cascade,
  title text not null, status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references cc.staff_members(user_id), due_on date, blocked_reason text,
  completed_at timestamptz, created_at timestamptz not null default now()
);
create table cc.task_comments (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references cc.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id), body text not null check (length(body) <= 4000),
  created_at timestamptz not null default now()
);

create table cc.content_items (
  id uuid primary key default gen_random_uuid(), title text not null,
  type text not null check (type in ('video','blog','documentary','research','news')),
  status text not null default 'idea' check (status in ('idea','in_production','review','scheduled','published')),
  assignee_id uuid references cc.staff_members(user_id), due_on date, publish_on date, url text,
  created_at timestamptz not null default now()
);
create table cc.media_metrics_daily (
  day date not null, source text not null default 'youtube', views bigint check (views >= 0),
  watch_time_minutes bigint check (watch_time_minutes >= 0), subscribers bigint check (subscribers >= 0),
  primary key (day, source)
);

create table cc.alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info','warning','critical')),
  kind text not null, message text not null, source text,
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create table cc.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  title text not null, body text, read_at timestamptz, created_at timestamptz not null default now()
);

create table cc.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily','weekly','monthly')),
  period_start date not null, period_end date not null,
  generated_at timestamptz not null default now(), generated_by uuid,
  payload jsonb not null, sources jsonb not null,
  unique (kind, period_start)
);
create table cc.report_schedules (
  kind text primary key check (kind in ('daily','weekly','monthly')),
  enabled boolean not null default false, recipients text[] not null default '{}'
);
insert into cc.report_schedules (kind) values ('daily'),('weekly'),('monthly');

-- Staff bootstrap guard: nobody can grant themselves a role through app code paths.
create function cc.prevent_self_grant() returns trigger language plpgsql as $$
begin
  if new.granted_by is not null and new.granted_by = new.user_id then
    raise exception 'staff cannot grant roles to themselves';
  end if;
  return new;
end $$;
create trigger staff_roles_no_self_grant before insert on cc.staff_roles
  for each row execute function cc.prevent_self_grant();

-- Lock down new tables (same pattern as 0001)
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='cc' loop
    execute format('alter table cc.%I enable row level security', t);
    execute format('revoke all on cc.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on cc.%I to service_role', t);
  end loop; end $$;
revoke update, delete, truncate on cc.audit_log from service_role;
grant select on cc.v_monthly_financials to service_role;
revoke all on cc.v_monthly_financials from anon, authenticated;
grant usage, select on all sequences in schema cc to service_role;

-- PUBLIC website content (new tables, names namespaced to avoid clashing with existing ones)
create table public.catalog_products (
  slug text primary key, name text not null, tagline text, description text,
  website_url text, app_url text, docs_url text, support_email text,
  published boolean not null default false, created_at timestamptz not null default now()
);
create table public.catalog_plans (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null references public.catalog_products(slug) on delete cascade,
  name text not null, price numeric(10,2) check (price >= 0), currency char(3) default 'USD',
  billing_interval text check (billing_interval in ('free','month','year','one_time')),
  features text[] not null default '{}', checkout_url text
);
create table public.publications (
  slug text primary key, title text not null, summary text,
  category text not null check (category in ('documentary','financial_education','insights','news','research','blog','video')),
  published boolean not null default false, published_at timestamptz
);
alter table public.catalog_products enable row level security;
alter table public.catalog_plans enable row level security;
alter table public.publications enable row level security;
create policy catalog_products_read on public.catalog_products for select using (published);
create policy catalog_plans_read on public.catalog_plans for select
  using (exists (select 1 from public.catalog_products p where p.slug = product_slug and p.published));
create policy publications_read on public.publications for select using (published);
grant select on public.catalog_products, public.catalog_plans, public.publications to anon, authenticated;

insert into public.catalog_products (slug, name, tagline, description, published)
values ('finora','Finora','Your Personal Finance Management Platform',
        'WealthOS presents Finora.', true);
