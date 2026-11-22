-- Phase 4-5: HR, CRM and partnerships, legal documents (private storage), engineering, marketing, customer support. ADDITIVE ONLY.

-- ================= HR (sensitive: separate permission for private fields) =================
create table cc.hr_positions (
  id uuid primary key default gen_random_uuid(), title text not null, org_unit_id uuid references cc.org_units(id),
  headcount integer not null default 1 check (headcount >= 1),
  status text not null default 'draft' check (status in ('draft','open','filled','closed')), description text,
  created_at timestamptz not null default now());
create table cc.hr_employees (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid unique references cc.staff_members(user_id),
  full_name text not null, work_email text, org_unit_id uuid references cc.org_units(id),
  hr_position_id uuid references cc.hr_positions(id), position_title text,
  manager_id uuid references cc.hr_employees(id),
  employment_status text not null default 'onboarding' check (employment_status in ('onboarding','active','on_leave','terminated')),
  employment_type text check (employment_type in ('full_time','part_time','contractor','intern')),
  start_date date, end_date date, created_at timestamptz not null default now(),
  check (manager_id is null or manager_id <> id), check (end_date is null or start_date is null or end_date >= start_date));
create function cc.employee_no_cycle() returns trigger language plpgsql as $$
begin
  if new.manager_id is not null and exists (
    with recursive up as (select id, manager_id from cc.hr_employees where id = new.manager_id
                          union all select e.id, e.manager_id from cc.hr_employees e join up on e.id = up.manager_id)
    select 1 from up where id = new.id) then raise exception 'reporting lines cannot form a cycle'; end if;
  return new; end $$;
create trigger employee_no_cycle before insert or update of manager_id on cc.hr_employees for each row execute function cc.employee_no_cycle();
create table cc.hr_employee_private (
  employee_id uuid primary key references cc.hr_employees(id) on delete cascade,
  personal_email text, phone text,
  compensation_amount numeric(14,2) check (compensation_amount >= 0), compensation_currency char(3),
  compensation_period text check (compensation_period in ('year','month','hour')), updated_at timestamptz not null default now());
create table cc.hr_candidates (
  id uuid primary key default gen_random_uuid(), full_name text not null, email text, hr_position_id uuid references cc.hr_positions(id),
  stage text not null default 'applied' check (stage in ('applied','screening','interview','offer','hired','rejected','withdrawn')),
  source text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table cc.hr_onboarding_tasks (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references cc.hr_employees(id) on delete cascade,
  title text not null, due_on date, done_at timestamptz, assigned_to uuid references cc.staff_members(user_id));
create table cc.hr_leave_requests (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references cc.hr_employees(id),
  leave_type text not null check (leave_type in ('vacation','sick','personal','unpaid','other')),
  start_date date not null, end_date date not null, reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_by uuid references auth.users(id), decided_at timestamptz, decision_note text,
  created_at timestamptz not null default now(), check (end_date >= start_date));
create function cc.decide_leave(p_actor uuid, p_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = cc, pg_temp as $$
declare l hr_leave_requests%rowtype; who uuid;
begin
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  if not has_permission(p_actor, 'hr', 'approve') then raise exception 'not permitted'; end if;
  select * into l from hr_leave_requests where id = p_id for update;
  if not found or l.status <> 'pending' then raise exception 'request is not pending'; end if;
  select staff_user_id into who from hr_employees where id = l.employee_id;
  if who is not null and who = p_actor then raise exception 'you cannot decide your own leave request'; end if;
  if p_decision = 'rejected' and (p_note is null or length(trim(p_note)) = 0) then raise exception 'a rejection reason is required'; end if;
  update hr_leave_requests set status = p_decision, decided_by = p_actor, decided_at = now(), decision_note = p_note where id = p_id;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta) values (p_actor, 'decide', 'leave_request', p_id::text, p_decision, '{}'::jsonb);
end $$;

-- ================= CRM and partnerships =================
create table cc.crm_companies (
  id uuid primary key default gen_random_uuid(), name text not null,
  kind text not null default 'prospect' check (kind in ('prospect','client','partner','vendor','other')),
  status text not null default 'active' check (status in ('active','inactive')), website text, notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now());
create table cc.crm_contacts (
  id uuid primary key default gen_random_uuid(), company_id uuid references cc.crm_companies(id), full_name text not null,
  email text, phone text, title text, created_at timestamptz not null default now());
create table cc.crm_deals (
  id uuid primary key default gen_random_uuid(), company_id uuid references cc.crm_companies(id), contact_id uuid references cc.crm_contacts(id),
  title text not null, stage text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  value numeric(14,2) check (value >= 0), currency char(3) not null default 'USD', owner_id uuid references cc.staff_members(user_id),
  expected_close date, closed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table cc.crm_activities (
  id uuid primary key default gen_random_uuid(), deal_id uuid references cc.crm_deals(id), company_id uuid references cc.crm_companies(id),
  kind text not null check (kind in ('call','email','meeting','note','task')), summary text not null,
  occurred_at timestamptz not null default now(), follow_up_on date, done boolean not null default false, created_by uuid references auth.users(id));
create table cc.partnerships (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references cc.crm_companies(id), title text not null,
  status text not null default 'exploring' check (status in ('exploring','negotiating','active','paused','ended')),
  summary text, owner_id uuid references cc.staff_members(user_id), created_at timestamptz not null default now());
create table cc.inquiries (                      -- written by the public contact form through the server only
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) <= 120), email text not null check (length(email) <= 254),
  topic text not null check (topic in ('general','partnership','press','investor','careers','support')),
  message text not null check (length(message) between 5 and 4000),
  status text not null default 'new' check (status in ('new','in_progress','answered','spam')),
  handled_by uuid references auth.users(id), created_at timestamptz not null default now());

-- ================= Legal and documents =================
create table cc.documents (
  id uuid primary key default gen_random_uuid(), title text not null,
  category text not null check (category in ('contract','agreement','policy','corporate','hr','technical','other')),
  confidentiality text not null default 'restricted' check (confidentiality in ('internal','restricted','confidential')),
  status text not null default 'draft' check (status in ('draft','active','expired','archived')),
  counterparty text, org_unit_id uuid references cc.org_units(id), employee_id uuid references cc.hr_employees(id),
  owner_id uuid references cc.staff_members(user_id), effective_on date, expires_on date,
  current_version integer not null default 0, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  check (expires_on is null or effective_on is null or expires_on >= effective_on));
create table cc.document_versions (
  id bigint generated always as identity primary key, document_id uuid not null references cc.documents(id) on delete restrict,
  version integer not null, storage_path text not null unique, filename text not null,
  mime text not null check (mime in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','text/plain')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760), sha256 text not null check (length(sha256) = 64),
  uploaded_by uuid references auth.users(id), at timestamptz not null default now(), unique (document_id, version));
create trigger document_versions_immutable before update or delete on cc.document_versions for each row execute function cc.revision_immutable();
create trigger document_versions_no_truncate before truncate on cc.document_versions for each statement execute function cc.revision_immutable();

-- Private bucket: no policies are created, so neither anon nor authenticated can read or list any object.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit) values ('documents', 'documents', false, 10485760) on conflict (id) do update set public = false;
  end if; end $$;

-- ================= Engineering =================
create table cc.milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references cc.projects(id) on delete cascade, title text not null, due_on date,
  status text not null default 'open' check (status in ('open','done','missed')), created_at timestamptz not null default now());
create table cc.releases (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references cc.products(id), version text not null,
  status text not null default 'planned' check (status in ('planned','in_progress','released','rolled_back')),
  planned_for date, released_at timestamptz, notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique (product_id, version));
create table cc.deployments (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references cc.products(id), release_id uuid references cc.releases(id),
  environment text not null check (environment in ('production','staging')), status text not null check (status in ('success','failed','rolled_back')),
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,40}$'), deployed_by uuid references cc.staff_members(user_id),
  deployed_at timestamptz not null default now(), notes text);
create table cc.incidents (
  id uuid primary key default gen_random_uuid(), product_id uuid references cc.products(id), title text not null,
  severity text not null check (severity in ('sev1','sev2','sev3','sev4')),
  status text not null default 'open' check (status in ('open','investigating','mitigated','resolved','closed')),
  started_at timestamptz not null default now(), resolved_at timestamptz, summary text, postmortem text,
  owner_id uuid references cc.staff_members(user_id), created_by uuid references auth.users(id),
  check (resolved_at is null or resolved_at >= started_at));
create table cc.incident_updates (
  id uuid primary key default gen_random_uuid(), incident_id uuid not null references cc.incidents(id) on delete cascade,
  body text not null check (length(body) <= 4000), author uuid references auth.users(id), at timestamptz not null default now());
create table cc.tech_docs (
  id uuid primary key default gen_random_uuid(), product_id uuid references cc.products(id), title text not null, body text check (length(body) <= 100000),
  version integer not null default 1, updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

-- Serious incidents and failed production deploys raise alerts automatically; resolving closes them.
create function cc.incident_alerts() returns trigger language plpgsql security definer set search_path = cc, pg_temp as $$
begin
  if tg_op = 'INSERT' and new.severity in ('sev1','sev2') then
    insert into alerts (severity, kind, message, source) values ('critical', 'incident', 'Open ' || new.severity || ' incident: ' || new.title, new.id::text) on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.status in ('resolved','closed') and old.status not in ('resolved','closed') then
    update alerts set resolved_at = now() where kind = 'incident' and source = new.id::text and resolved_at is null;
  end if;
  return new;
end $$;
create trigger incidents_alert after insert or update of status on cc.incidents for each row execute function cc.incident_alerts();
create function cc.deployment_alerts() returns trigger language plpgsql security definer set search_path = cc, pg_temp as $$
begin
  if new.environment = 'production' and new.status = 'failed' then
    insert into alerts (severity, kind, message, source) values ('warning', 'deploy_failed', 'A production deployment failed', new.product_id::text) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger deployments_alert after insert on cc.deployments for each row execute function cc.deployment_alerts();

-- ================= Marketing =================
create table cc.campaigns (
  id uuid primary key default gen_random_uuid(), name text not null,
  status text not null default 'planned' check (status in ('planned','active','paused','completed')),
  channel text, objective text, budget numeric(14,2) check (budget >= 0), currency char(3) not null default 'USD',
  starts_on date, ends_on date, owner_id uuid references cc.staff_members(user_id), results_notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), check (ends_on is null or starts_on is null or ends_on >= starts_on));

-- ================= Customer support (customer-facing, RLS-isolated) =================
create table public.support_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (length(subject) between 3 and 160),
  category text not null default 'general' check (category in ('general','billing','account','technical','privacy')),
  status text not null default 'open' check (status in ('open','pending','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.support_messages (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.support_requests(id) on delete cascade,
  author_user_id uuid references auth.users(id), is_staff boolean not null default false,
  body text not null check (length(body) between 1 and 4000), created_at timestamptz not null default now());
alter table public.support_requests enable row level security;
alter table public.support_messages enable row level security;
create policy sr_select on public.support_requests for select to authenticated using (user_id = auth.uid());
create policy sr_insert on public.support_requests for insert to authenticated with check (user_id = auth.uid() and status = 'open');
create policy sm_select on public.support_messages for select to authenticated using (exists (select 1 from public.support_requests r where r.id = request_id and r.user_id = auth.uid()));
create policy sm_insert on public.support_messages for insert to authenticated
  with check (is_staff = false and author_user_id = auth.uid() and exists (select 1 from public.support_requests r where r.id = request_id and r.user_id = auth.uid() and r.status <> 'closed'));
revoke all on public.support_requests, public.support_messages from anon, authenticated;
grant select, insert on public.support_requests, public.support_messages to authenticated;
create index on public.support_requests (user_id, created_at desc);
create index on public.support_messages (request_id, created_at);

-- ================= lock down =================
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
revoke delete on cc.documents from service_role;
revoke update, delete, truncate on cc.document_versions from service_role;
revoke all on function cc.decide_leave from public, anon, authenticated; grant execute on function cc.decide_leave to service_role;
grant usage, select on all sequences in schema cc to service_role;
