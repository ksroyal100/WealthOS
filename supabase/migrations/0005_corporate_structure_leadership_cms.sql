-- Phase 1: corporate structure, verified leadership, CMS with review workflow. ADDITIVE ONLY.
-- Principle: nothing becomes public unless a person with the right permission, other than the author, approved it.

-- ---------- 1. Corporate structure ----------
create table cc.org_units (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references cc.org_units(id) on delete restrict,
  kind text not null check (kind in ('parent_company','division','department','team','subsidiary')),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  description text,
  status text not null default 'planned' check (status in ('planned','active','paused','closed')),
  -- Internal divisions are NOT assumed to be legal entities. Legal facts exist only when explicitly recorded.
  legal_status text not null default 'unknown' check (legal_status in ('unknown','not_a_legal_entity','legal_entity')),
  legal_name text, jurisdiction text, registration_number text,
  owner_id uuid references cc.staff_members(user_id),
  public_listed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (legal_status = 'legal_entity' or (legal_name is null and jurisdiction is null and registration_number is null)),
  check (kind <> 'parent_company' or parent_id is null),
  check (parent_id is null or parent_id <> id)
);
create unique index org_single_parent_company on cc.org_units (kind) where kind = 'parent_company';

create function cc.org_no_cycle() returns trigger language plpgsql as $$
begin
  if new.parent_id is not null and exists (
    with recursive up as (
      select id, parent_id from cc.org_units where id = new.parent_id
      union all select o.id, o.parent_id from cc.org_units o join up on o.id = up.parent_id)
    select 1 from up where id = new.id) then
    raise exception 'organization units cannot form a cycle';
  end if;
  return new;
end $$;
create trigger org_no_cycle before insert or update of parent_id on cc.org_units for each row execute function cc.org_no_cycle();

alter table cc.products add column if not exists org_unit_id uuid references cc.org_units(id);

-- ---------- 2. Leadership ----------
create table cc.leadership_positions (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key in ('ceo','cfo','cto','coo','cmo','chro','general_counsel','department_head')),
  title text not null,
  org_unit_id uuid references cc.org_units(id),
  reports_to uuid references cc.leadership_positions(id),
  responsibilities text,
  appointment_status text not null default 'vacant' check (appointment_status in ('vacant','announced','acting','appointed')),
  created_at timestamptz not null default now(),
  check (reports_to is null or reports_to <> id)
);
create unique index leadership_one_per_key on cc.leadership_positions (key) where key <> 'department_head';

create table cc.executive_profiles (
  id uuid primary key default gen_random_uuid(),
  position_id uuid unique references cc.leadership_positions(id) on delete set null,
  staff_user_id uuid references cc.staff_members(user_id),
  full_name text not null, headline text, bio text, photo_path text,
  verified_at timestamptz, verified_by uuid references auth.users(id),
  visibility text not null default 'hidden' check (visibility in ('hidden','internal','public')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (visibility <> 'public' or (verified_at is not null and verified_by is not null))
);

create function cc.exec_public_guard() returns trigger language plpgsql as $$
begin
  if new.visibility = 'public' then
    if new.verified_by is not distinct from new.staff_user_id and new.staff_user_id is not null then
      raise exception 'a profile cannot be verified by the person it describes';
    end if;
    if not exists (select 1 from cc.leadership_positions p where p.id = new.position_id and p.appointment_status = 'appointed') then
      raise exception 'only appointed positions can be shown publicly';
    end if;
  end if;
  return new;
end $$;
create trigger exec_public_guard before insert or update on cc.executive_profiles for each row execute function cc.exec_public_guard();

create function cc.position_status_sync() returns trigger language plpgsql as $$
begin
  if new.appointment_status <> 'appointed' then
    update cc.executive_profiles set visibility = 'hidden' where position_id = new.id and visibility = 'public';
  end if;
  return new;
end $$;
create trigger position_status_sync after update of appointment_status on cc.leadership_positions for each row execute function cc.position_status_sync();

-- ---------- 3. CMS with review workflow ----------
create table cc.cms_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('page','announcement','press_release','article','career','division','product_info','policy')),
  slug text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (length(title) between 2 and 200),
  summary text check (length(summary) <= 400),
  body text check (length(body) <= 100000),
  topic text,
  status text not null default 'draft' check (status in ('draft','in_review','approved','published','unpublished')),
  version integer not null default 1,
  created_by uuid not null references auth.users(id),
  submitted_by uuid references auth.users(id), reviewed_by uuid references auth.users(id), approved_by uuid references auth.users(id),
  published_at timestamptz, unpublished_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (type, slug),
  check (approved_by is null or approved_by <> created_by),                                   -- no self-approval
  check (status not in ('approved','published') or approved_by is not null)                    -- cannot publish without approval
);
create index on cc.cms_documents (status, published_at);

create table cc.cms_revisions (
  id bigint generated always as identity primary key,
  document_id uuid not null references cc.cms_documents(id) on delete restrict,
  version integer not null, status text not null,
  title text not null, summary text, body text, topic text,
  edited_by uuid, at timestamptz not null default now()
);
create function cc.revision_immutable() returns trigger language plpgsql as $$ begin raise exception 'revisions are append-only'; end $$;
create trigger revisions_no_change before update or delete on cc.cms_revisions for each row execute function cc.revision_immutable();
create trigger revisions_no_truncate before truncate on cc.cms_revisions for each statement execute function cc.revision_immutable();

-- Content locks while under review/approved/live; status can only change through cc.cms_transition.
create function cc.cms_guard() returns trigger language plpgsql as $$
declare changed boolean; in_fn boolean := coalesce(current_setting('cc.transition', true), '') = '1';
begin
  changed := (new.title, new.summary, new.body, new.topic) is distinct from (old.title, old.summary, old.body, old.topic);
  if changed then
    if old.status in ('in_review','approved','published') then raise exception 'content is locked while status is %; unpublish or reject first', old.status; end if;
    if old.status = 'unpublished' then
      new.status := 'draft'; new.approved_by := null; new.submitted_by := null; new.reviewed_by := null; new.published_at := null;
    end if;
    new.version := old.version + 1;
  elsif new.status is distinct from old.status and not in_fn then
    raise exception 'status can only change through cms_transition';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger cms_guard before update on cc.cms_documents for each row execute function cc.cms_guard();

create function cc.cms_revision_log() returns trigger language plpgsql security definer set search_path = cc, pg_temp as $$
declare actor uuid := nullif(current_setting('cc.actor', true), '')::uuid;
begin
  if tg_op = 'INSERT' or (new.title, new.summary, new.body, new.topic, new.status) is distinct from (old.title, old.summary, old.body, old.topic, old.status) then
    insert into cms_revisions (document_id, version, status, title, summary, body, topic, edited_by)
    values (new.id, new.version, new.status, new.title, new.summary, new.body, new.topic, coalesce(actor, new.created_by));
  end if;
  return new;
end $$;
create trigger cms_revision_log after insert or update on cc.cms_documents for each row execute function cc.cms_revision_log();

create function cc.cms_save(p_user uuid, p_doc uuid, p_type text, p_slug text, p_title text, p_summary text, p_body text, p_topic text)
returns uuid language plpgsql security definer set search_path = cc, pg_temp as $$
declare v_id uuid;
begin
  perform set_config('cc.actor', p_user::text, true);
  if p_doc is null then
    if not has_permission(p_user, 'cms', 'create') then raise exception 'not permitted'; end if;
    insert into cms_documents (type, slug, title, summary, body, topic, created_by) values (p_type, p_slug, p_title, p_summary, p_body, p_topic, p_user) returning id into v_id;
    insert into audit_log (actor_id, action, resource, record_id, outcome, meta) values (p_user, 'create', 'cms_document', v_id::text, 'success', jsonb_build_object('type', p_type));
  else
    if not has_permission(p_user, 'cms', 'edit') then raise exception 'not permitted'; end if;
    update cms_documents set title = p_title, summary = p_summary, body = p_body, topic = p_topic where id = p_doc;
    if not found then raise exception 'document not found'; end if;
    v_id := p_doc;
    insert into audit_log (actor_id, action, resource, record_id, outcome) values (p_user, 'edit', 'cms_document', v_id::text, 'success');
  end if;
  perform set_config('cc.actor', '', true);
  return v_id;
end $$;

create function cc.cms_transition(p_doc uuid, p_user uuid, p_to text, p_note text default null, p_schedule timestamptz default null)
returns void language plpgsql security definer set search_path = cc, pg_temp as $$
declare d cms_documents%rowtype;
begin
  perform set_config('cc.transition', '1', true); perform set_config('cc.actor', p_user::text, true);
  select * into d from cms_documents where id = p_doc for update;
  if not found then raise exception 'document not found'; end if;
  if d.status = 'draft' and p_to = 'in_review' then
    if not has_permission(p_user, 'cms', 'edit') then raise exception 'not permitted'; end if;
    update cms_documents set status = 'in_review', submitted_by = p_user where id = p_doc;
  elsif d.status = 'in_review' and p_to = 'draft' then
    if not has_permission(p_user, 'cms', 'approve') then raise exception 'not permitted'; end if;
    if p_note is null or length(trim(p_note)) = 0 then raise exception 'a rejection reason is required'; end if;
    update cms_documents set status = 'draft', submitted_by = null, reviewed_by = p_user where id = p_doc;
  elsif d.status = 'in_review' and p_to = 'approved' then
    if not has_permission(p_user, 'cms', 'approve') then raise exception 'not permitted'; end if;
    if p_user = d.created_by or p_user = d.submitted_by then raise exception 'cannot approve work you created or submitted'; end if;
    update cms_documents set status = 'approved', approved_by = p_user, reviewed_by = p_user where id = p_doc;
  elsif d.status = 'approved' and p_to = 'published' then
    if not has_permission(p_user, 'cms', 'approve') then raise exception 'not permitted'; end if;
    update cms_documents set status = 'published', published_at = coalesce(p_schedule, now()) where id = p_doc;   -- a future date = scheduled
  elsif d.status = 'published' and p_to = 'unpublished' then
    if not has_permission(p_user, 'cms', 'approve') then raise exception 'not permitted'; end if;
    update cms_documents set status = 'unpublished', unpublished_at = now() where id = p_doc;
  elsif d.status = 'unpublished' and p_to = 'draft' then
    if not has_permission(p_user, 'cms', 'edit') then raise exception 'not permitted'; end if;
    update cms_documents set status = 'draft', approved_by = null, submitted_by = null, reviewed_by = null, published_at = null where id = p_doc;
  else
    raise exception 'transition from % to % is not allowed', d.status, p_to;
  end if;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta)
  values (p_user, 'transition', 'cms_document', p_doc::text, case p_to when 'approved' then 'approved' when 'draft' then 'rejected' else 'success' end, jsonb_build_object('from', d.status, 'to', p_to, 'note', p_note));
  perform set_config('cc.transition', '', true);      -- close the window: the lock must not stay open for the rest of the transaction
  perform set_config('cc.actor', '', true);
end $$;

-- ---------- 4. Permission change history ----------
create function cc.log_role_change() returns trigger language plpgsql security definer set search_path = cc, pg_temp as $$
declare r record;
begin
  r := case tg_op when 'DELETE' then old else new end;
  insert into audit_log (actor_id, action, resource, record_id, outcome, meta)
  values (case tg_op when 'INSERT' then new.granted_by else null end, case tg_op when 'INSERT' then 'role_grant' else 'role_revoke' end, 'staff_role', r.user_id::text, 'success', jsonb_build_object('role_id', r.role_id));
  return r;
end $$;
create trigger staff_roles_history after insert or delete on cc.staff_roles for each row execute function cc.log_role_change();

-- ---------- 5. Permissions for the new resources ----------
insert into cc.permissions (resource, action)
select r, a from unnest(array['cms','org','leadership']) r, unnest(array['view','create','edit','approve','export','delete']) a;
insert into cc.role_permissions select ro.id, p.id from cc.roles ro, cc.permissions p where ro.key = 'ceo' and p.resource in ('cms','org','leadership');
insert into cc.role_permissions select ro.id, p.id from cc.roles ro, cc.permissions p where ro.key = 'media_manager' and p.resource = 'cms' and p.action in ('view','create','edit');

-- ---------- 6. Structure from the company's own plan (internal; nothing here is public or a legal claim) ----------
insert into cc.org_units (kind, slug, name, status, description) values ('parent_company', 'wealthos', 'WealthOS', 'active', 'Parent company');
insert into cc.org_units (parent_id, kind, slug, name, status, description)
select (select id from cc.org_units where slug = 'wealthos'), 'division', s, n, 'active', d from (values
  ('corporate', 'Corporate', 'Governance, leadership and corporate affairs'),
  ('media', 'WealthOS Media', 'Financial education, business, technology and research publishing'),
  ('technology', 'WealthOS Technology', 'Software products and digital platforms'),
  ('business-operations', 'Business Operations', 'Internal operating functions'),
  ('customer-ecosystem', 'Customer Ecosystem', 'Marketplace, subscriptions and customer support')) v(s, n, d);
insert into cc.org_units (parent_id, kind, slug, name, status)
select (select id from cc.org_units where slug = 'business-operations'), 'department', s, n, 'active' from (values
  ('finance', 'Finance'), ('product-management', 'Product Management'), ('marketing', 'Marketing'), ('operations', 'Operations')) v(s, n);
insert into cc.org_units (parent_id, kind, slug, name, status)
select (select id from cc.org_units where slug = 'customer-ecosystem'), 'team', 'customer-support', 'Customer Support', 'active';
update cc.products set org_unit_id = (select id from cc.org_units where slug = 'technology') where slug = 'finora';

-- Positions exist internally as VACANT. Nobody is marked appointed until someone does it deliberately.
insert into cc.leadership_positions (key, title) values
  ('ceo','Founder and CEO'),('cfo','Chief Financial Officer'),('cto','Chief Technology Officer'),('coo','Chief Operating Officer'),
  ('cmo','Chief Marketing Officer'),('chro','Chief Human Resources Officer'),('general_counsel','General Counsel');
update cc.leadership_positions p set reports_to = (select id from cc.leadership_positions where key = 'ceo') where p.key <> 'ceo';

-- ---------- 7. Lock down + public projections (only these views are visible to the public site) ----------
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'cc' loop
    execute format('alter table cc.%I enable row level security', t);
    execute format('revoke all on cc.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on cc.%I to service_role', t);
  end loop; end $$;
revoke delete on cc.cms_documents from service_role;
revoke update, delete, truncate on cc.cms_revisions from service_role;
revoke update, delete, truncate on cc.audit_log from service_role;
grant usage, select on all sequences in schema cc to service_role;
revoke all on function cc.cms_save, cc.cms_transition from public, anon, authenticated;
grant execute on function cc.cms_save, cc.cms_transition to service_role;

create view public.cms_published as
  select type, slug, title, summary, body, topic, published_at, version from cc.cms_documents
  where status = 'published' and published_at <= now();
create view public.public_leadership as
  select p.key, p.title, e.full_name, e.headline, e.bio, e.photo_path, u.name as unit_name, p.responsibilities
  from cc.executive_profiles e join cc.leadership_positions p on p.id = e.position_id left join cc.org_units u on u.id = p.org_unit_id
  where e.visibility = 'public' and e.verified_at is not null and p.appointment_status = 'appointed';
create view public.public_org_units as
  select u.slug, u.name, u.kind, u.description, u.status, pu.slug as parent_slug,
         case when u.legal_status = 'legal_entity' then u.legal_name end as legal_name,
         case when u.legal_status = 'legal_entity' then u.jurisdiction end as jurisdiction, u.legal_status
  from cc.org_units u left join cc.org_units pu on pu.id = u.parent_id where u.public_listed and u.status = 'active';
grant select on public.cms_published, public.public_leadership, public.public_org_units to anon, authenticated;
