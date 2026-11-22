-- Corporate structure, leadership verification and CMS workflow tests. Run after all migrations. Rolls back.
begin;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$
begin
  begin execute sql; raise exception 'FAILED: expected error containing "%" but statement succeeded: %', expect, sql;
  exception when others then if sqlerrm like 'FAILED%' then raise; end if; if position(expect in sqlerrm) = 0 then raise exception 'FAILED: wrong error "%" (wanted "%")', sqlerrm, expect; end if; end;
end $$;
create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$ begin if not cond then raise exception 'FAILED: %', msg; end if; end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1'),('00000000-0000-0000-0000-0000000000d2'),('00000000-0000-0000-0000-0000000000d3'),('00000000-0000-0000-0000-0000000000d4');
insert into cc.staff_members (user_id, full_name, status) values
 ('00000000-0000-0000-0000-0000000000d1','Author','active'),('00000000-0000-0000-0000-0000000000d2','Reviewer','active'),
 ('00000000-0000-0000-0000-0000000000d3','Developer','active'),('00000000-0000-0000-0000-0000000000d4','Exec','active');
insert into cc.staff_roles (user_id, role_id) select v.u, r.id from (values
 ('00000000-0000-0000-0000-0000000000d1'::uuid,'media_manager'),('00000000-0000-0000-0000-0000000000d2','ceo'),('00000000-0000-0000-0000-0000000000d3','developer')) v(u,k) join cc.roles r on r.key = v.k;
select pg_temp.assert((select count(*) from cc.audit_log where action = 'role_grant') >= 3, 'role grants are written to the audit log');

-- structure
select pg_temp.assert((select count(*) from cc.org_units where kind = 'parent_company') = 1, 'one parent company seeded');
select pg_temp.assert(not exists (select 1 from cc.org_units where legal_status <> 'unknown'), 'no legal status is assumed for seeded units');
select pg_temp.fails($$ insert into cc.org_units (kind, slug, name) values ('parent_company','second','Second') $$, 'org_single_parent_company');
select pg_temp.fails($$ update cc.org_units set parent_id = (select id from cc.org_units where slug = 'finance') where slug = 'business-operations' $$, 'cycle');
select pg_temp.fails($$ update cc.org_units set legal_name = 'X Inc' where slug = 'media' $$, 'org_units_check');
update cc.org_units set legal_status = 'legal_entity', legal_name = 'Test Ltd', jurisdiction = 'Nowhere' where slug = 'media';

-- leadership: public only when verified, by someone else, and the position is appointed
insert into cc.executive_profiles (position_id, staff_user_id, full_name) select id, '00000000-0000-0000-0000-0000000000d4', 'Test Exec' from cc.leadership_positions where key = 'cfo';
select pg_temp.fails($$ update cc.executive_profiles set visibility = 'public' $$, 'only appointed positions');
select pg_temp.fails($$ update cc.executive_profiles set visibility = 'public', verified_at = now(), verified_by = '00000000-0000-0000-0000-0000000000d4' $$, 'cannot be verified by the person');
select pg_temp.fails($$ update cc.executive_profiles set visibility = 'public', verified_at = now(), verified_by = '00000000-0000-0000-0000-0000000000d2' $$, 'only appointed positions');
update cc.leadership_positions set appointment_status = 'appointed' where key = 'cfo';
select pg_temp.fails($$ update cc.executive_profiles set visibility = 'public' $$, 'executive_profiles_check');
update cc.executive_profiles set visibility = 'public', verified_at = now(), verified_by = '00000000-0000-0000-0000-0000000000d2';
select pg_temp.assert((select count(*) from public.public_leadership) = 1, 'verified appointed public profile is listed');
update cc.leadership_positions set appointment_status = 'vacant' where key = 'cfo';
select pg_temp.assert((select count(*) from public.public_leadership) = 0, 'vacating a position removes the profile from the public view');
select pg_temp.assert((select visibility from cc.executive_profiles) = 'hidden', 'profile is hidden automatically');

-- CMS workflow
select cc.cms_save('00000000-0000-0000-0000-0000000000d1', null, 'press_release', 'launch', 'Launch', 'Summary', 'Body', null) as doc \gset
select pg_temp.assert((select status from cc.cms_documents where id = :'doc') = 'draft', 'new content starts as draft');
select pg_temp.fails(format($$ select cc.cms_transition(%L, '00000000-0000-0000-0000-0000000000d3', 'in_review') $$, :'doc'), 'not permitted');
select cc.cms_transition(:'doc', '00000000-0000-0000-0000-0000000000d1', 'in_review');
select pg_temp.fails(format($$ select cc.cms_transition(%L, '00000000-0000-0000-0000-0000000000d1', 'approved') $$, :'doc'), 'not permitted');
select pg_temp.fails(format($$ update cc.cms_documents set title = 'Sneaky' where id = %L $$, :'doc'), 'locked');
select pg_temp.fails(format($$ update cc.cms_documents set status = 'published', approved_by = '00000000-0000-0000-0000-0000000000d2' where id = %L $$, :'doc'), 'only change through cms_transition');
select pg_temp.fails(format($$ select cc.cms_transition(%L, '00000000-0000-0000-0000-0000000000d2', 'draft') $$, :'doc'), 'rejection reason');
select cc.cms_transition(:'doc', '00000000-0000-0000-0000-0000000000d2', 'draft', 'Needs a source');
select pg_temp.assert((select status from cc.cms_documents where id = :'doc') = 'draft', 'rejection returns to draft');
select cc.cms_save('00000000-0000-0000-0000-0000000000d1', :'doc', null, null, 'Launch v2', 'Summary', 'Body', null);
select pg_temp.assert((select version from cc.cms_documents where id = :'doc') = 2, 'editing bumps the version');
select cc.cms_transition(:'doc', '00000000-0000-0000-0000-0000000000d1', 'in_review');
select cc.cms_transition(:'doc', '00000000-0000-0000-0000-0000000000d2', 'approved');
select pg_temp.assert((select count(*) from public.cms_published) = 0, 'approved is not public');
select cc.cms_transition(:'doc', '00000000-0000-0000-0000-0000000000d2', 'published', null, now() + interval '1 day');
select pg_temp.assert((select count(*) from public.cms_published) = 0, 'scheduled content is not public yet');
update cc.cms_documents set published_at = now() - interval '1 minute' where id = :'doc';
select pg_temp.assert((select count(*) from public.cms_published) = 1, 'published content is public');
select pg_temp.fails(format($$ select cc.cms_save('00000000-0000-0000-0000-0000000000d1', %L, null, null, 'Edit live', 's', 'b', null) $$, :'doc'), 'locked');
select cc.cms_transition(:'doc', '00000000-0000-0000-0000-0000000000d2', 'unpublished');
select pg_temp.assert((select count(*) from public.cms_published) = 0, 'unpublish removes it immediately');
select pg_temp.assert((select count(*) from cc.cms_revisions where document_id = :'doc') >= 5, 'every change is kept as a revision');
select pg_temp.fails($$ update cc.cms_revisions set title = 'x' $$, 'append-only');
select pg_temp.fails($$ delete from cc.cms_revisions $$, 'append-only');

-- no self-approval, even for a CEO
select cc.cms_save('00000000-0000-0000-0000-0000000000d2', null, 'article', 'mine', 'Mine', 's', 'b', null) as doc2 \gset
select cc.cms_transition(:'doc2', '00000000-0000-0000-0000-0000000000d2', 'in_review');
select pg_temp.fails(format($$ select cc.cms_transition(%L, '00000000-0000-0000-0000-0000000000d2', 'approved') $$, :'doc2'), 'cannot approve work you created');

-- the public role sees only the published projections
set local role anon;
select pg_temp.fails($$ select 1 from cc.cms_documents $$, 'permission denied');
select pg_temp.fails($$ select 1 from cc.executive_profiles $$, 'permission denied');
select pg_temp.fails($$ select 1 from cc.org_units $$, 'permission denied');
select pg_temp.assert((select count(*) from public.public_org_units) = 0, 'nothing is listed publicly until marked public_listed');
reset role;
rollback;
select 'corporate tests passed' as result;
