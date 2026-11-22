-- RBAC administration, multi-level approvals, FX policy, HR separation, documents, engineering alerts, support isolation. Rolls back.
begin;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$
begin
  begin execute sql; raise exception 'FAILED: expected error containing "%" but succeeded: %', expect, sql;
  exception when others then if sqlerrm like 'FAILED%' then raise; end if; if position(expect in sqlerrm) = 0 then raise exception 'FAILED: wrong error "%" (wanted "%") for %', sqlerrm, expect, sql; end if; end;
end $$;
create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$ begin if not cond then raise exception 'FAILED: %', msg; end if; end $$;

-- e1 CEO, e2 CFO, e3 CTO, e4 HR manager, e5 dept manager (scoped to Finance), e6 developer, e7 auditor, e8 finance staff, e9 second CEO
insert into auth.users (id) select ('00000000-0000-0000-0000-00000000e00' || i)::uuid from generate_series(1,9) i;
insert into cc.staff_members (user_id, full_name, status) select ('00000000-0000-0000-0000-00000000e00' || i)::uuid, 'User ' || i, 'active' from generate_series(1,9) i;
create function pg_temp.uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-00000000e00' || n)::uuid $$;
insert into cc.staff_roles (user_id, role_id)
  select pg_temp.uid(v.i), r.id from (values (1,'ceo'),(2,'cfo'),(3,'cto'),(4,'hr_manager'),(6,'developer'),(7,'auditor'),(8,'finance_staff'),(9,'ceo')) v(i,k) join cc.roles r on r.key = v.k;
insert into cc.staff_roles (user_id, role_id, scope_org_unit_id)
  select pg_temp.uid(5), r.id, (select id from cc.org_units where slug = 'finance') from cc.roles r where r.key = 'department_manager';

-- ===== role matrix =====
select pg_temp.assert(cc.has_permission(pg_temp.uid(3),'engineering','approve'), 'CTO manages engineering');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(3),'finance','view'), 'CTO cannot see finance');
select pg_temp.assert(cc.has_permission(pg_temp.uid(4),'hr_sensitive','view'), 'HR manager sees sensitive HR');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(7),'hr_sensitive','view'), 'auditor cannot see sensitive HR');
select pg_temp.assert(cc.has_permission(pg_temp.uid(7),'finance','view') and not cc.has_permission(pg_temp.uid(7),'finance','create'), 'auditor is read-only');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(8),'finance','approve'), 'finance staff cannot approve');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(6),'legal','view'), 'developer cannot see legal documents');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(5),'projects','view'), 'a scoped role grants nothing company-wide');
select pg_temp.assert(cc.has_permission_in_unit(pg_temp.uid(5),'projects','view',(select id from cc.org_units where slug='finance')), 'scoped role works inside its unit');
select pg_temp.assert(not cc.has_permission_in_unit(pg_temp.uid(5),'projects','view',(select id from cc.org_units where slug='marketing')), 'scoped role does not reach other units');

-- ===== role administration =====
select pg_temp.fails(format($$ select cc.grant_role(%L, %L, 'ceo') $$, pg_temp.uid(1), pg_temp.uid(1)), 'your own roles');
select pg_temp.fails(format($$ select cc.grant_role(%L, %L, 'media_manager') $$, pg_temp.uid(6), pg_temp.uid(8)), 'not permitted');
select cc.grant_role(pg_temp.uid(1), pg_temp.uid(6), 'media_manager');
select pg_temp.assert(cc.has_permission(pg_temp.uid(6),'marketing','create'), 'granted role takes effect');
select pg_temp.assert(exists (select 1 from cc.audit_log where action = 'role_grant' and record_id = pg_temp.uid(6)::text), 'role grant is in the permission history');
-- delegated administrator cannot escalate
select cc.set_override(pg_temp.uid(1), pg_temp.uid(4), 'roles', 'edit', 'allow', 'HR administers access');
select cc.set_override(pg_temp.uid(1), pg_temp.uid(4), 'roles', 'create', 'allow', 'HR creates roles');
select pg_temp.fails(format($$ select cc.grant_role(%L, %L, 'cfo') $$, pg_temp.uid(4), pg_temp.uid(6)), 'only the Founder and CEO');
select pg_temp.fails(format($$ select cc.grant_role(%L, %L, 'finance_staff') $$, pg_temp.uid(4), pg_temp.uid(6)), 'do not hold');
select pg_temp.fails(format($$ select cc.create_custom_role(%L, 'custom_peek', 'Peek', 'x', array['finance:view']) $$, pg_temp.uid(4)), 'do not hold');
select cc.create_custom_role(pg_temp.uid(4), 'custom_hr_viewer', 'HR viewer', 'Views HR', array['hr:view']);
select pg_temp.fails(format($$ select cc.create_custom_role(%L, 'bad key', 'X', 'x', array['hr:view']) $$, pg_temp.uid(1)), 'custom role keys');
-- overrides
select pg_temp.fails(format($$ select cc.set_override(%L, %L, 'finance', 'view', 'allow', 'self') $$, pg_temp.uid(1), pg_temp.uid(1)), 'your own permissions');
select pg_temp.fails(format($$ select cc.set_override(%L, %L, 'finance', 'view', 'deny', '') $$, pg_temp.uid(1), pg_temp.uid(8)), 'reason is required');
select cc.set_override(pg_temp.uid(1), pg_temp.uid(8), 'finance', 'create', 'deny', 'Under review');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(8),'finance','create'), 'a deny override beats the role');
select cc.set_override(pg_temp.uid(1), pg_temp.uid(6), 'finance', 'view', 'allow', 'Expired grant', now() - interval '1 day');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(6),'finance','view'), 'an expired override grants nothing');
-- deactivation and the last CEO
select pg_temp.fails(format($$ select cc.set_staff_status(%L, %L, 'deactivated') $$, pg_temp.uid(1), pg_temp.uid(1)), 'your own account');
select cc.set_staff_status(pg_temp.uid(1), pg_temp.uid(9), 'deactivated', 'Left the company');
select pg_temp.assert(not cc.has_permission(pg_temp.uid(9),'finance','view'), 'a deactivated staff member has no access');
select cc.set_staff_status(pg_temp.uid(1), pg_temp.uid(9), 'active');
select pg_temp.fails(format($$ select cc.revoke_role(%L, %L, 'cfo') $$, pg_temp.uid(4), pg_temp.uid(2)), 'only the Founder and CEO');
select cc.revoke_role(pg_temp.uid(1), pg_temp.uid(9), 'ceo');
select pg_temp.fails(format($$ select cc.revoke_role(%L, %L, 'ceo') $$, pg_temp.uid(1), pg_temp.uid(1)), 'last active');
select pg_temp.assert(exists (select 1 from cc.audit_log where action = 'role_revoke'), 'role revocation is in the permission history');
select pg_temp.assert(exists (select 1 from cc.audit_log where action = 'permission_override'), 'overrides are audited');

-- ===== multi-level approvals =====
delete from cc.user_permission_overrides where user_id = pg_temp.uid(8);   -- lift the earlier deny so finance staff can file requests
select pg_temp.assert(cc.has_permission(pg_temp.uid(8),'finance','create'), 'removing the deny override restores the role permission');
insert into cc.approval_limits values (pg_temp.uid(2),'USD',10000),(pg_temp.uid(1),'USD',50000);
insert into cc.approval_policies (kind, currency, min_amount, required_levels) values ('*','USD',2000,2);
select cc.request_approval(pg_temp.uid(8), 'vendor_payment', 'Big vendor', 5000, 'USD') as big \gset
select cc.request_approval(pg_temp.uid(8), 'vendor_payment', 'Small vendor', 500, 'USD') as small \gset
select cc.request_approval(pg_temp.uid(8), 'vendor_payment', 'Huge vendor', 20000, 'USD') as huge \gset
select cc.request_approval(pg_temp.uid(8), 'vendor_payment', 'Mid vendor', 3000, 'USD') as mid \gset
select pg_temp.assert((select required_levels from cc.approvals where id = :'big') = 2 and (select required_levels from cc.approvals where id = :'small') = 1, 'policy sets the number of levels');
select pg_temp.fails(format($$ select cc.decide_approval(%L, %L, 'approved') $$, :'big', pg_temp.uid(8)), 'cannot decide own');
select pg_temp.fails(format($$ select cc.decide_approval(%L, %L, 'approved') $$, :'big', pg_temp.uid(3)), 'not permitted');
select cc.decide_approval(:'big', pg_temp.uid(2), 'approved');
select pg_temp.assert((select status from cc.approvals where id = :'big') = 'pending', 'one approval is not enough when two levels are required');
select pg_temp.fails(format($$ select cc.decide_approval(%L, %L, 'approved') $$, :'big', pg_temp.uid(2)), 'already decided');
select cc.decide_approval(:'big', pg_temp.uid(1), 'approved');
select pg_temp.assert((select status from cc.approvals where id = :'big') = 'approved', 'second approver completes it');
select cc.decide_approval(:'small', pg_temp.uid(2), 'approved');
select pg_temp.assert((select status from cc.approvals where id = :'small') = 'approved', 'single-level approval works');
select pg_temp.fails(format($$ select cc.decide_approval(%L, %L, 'approved') $$, :'huge', pg_temp.uid(2)), 'exceeds approval limit');
select pg_temp.fails(format($$ select cc.decide_approval(%L, %L, 'rejected') $$, :'mid', pg_temp.uid(2)), 'rejection reason');
select cc.decide_approval(:'mid', pg_temp.uid(2), 'rejected', 'Not budgeted');
select pg_temp.assert((select status from cc.approvals where id = :'mid') = 'rejected', 'rejection ends the request');
select pg_temp.fails(format($$ select cc.decide_approval(%L, %L, 'approved') $$, :'mid', pg_temp.uid(1)), 'not pending');
select pg_temp.fails($$ update cc.approval_decisions set reason = 'x' $$, 'append-only');

-- ===== FX: no mixing currencies without a documented rate =====
insert into cc.ledger_entries (occurred_on, kind, status, amount, currency) values (current_date,'revenue','received',100,'USD'),(current_date,'revenue','received',200,'EUR');
select pg_temp.assert((select status from cc.consolidate('USD', current_date) where currency = 'EUR') = 'missing_rate', 'without a rate the foreign currency is flagged, not converted');
select pg_temp.assert((select converted from cc.consolidate('USD', current_date) where currency = 'EUR') is null, 'no guessed conversion');
select pg_temp.fails($$ insert into cc.fx_rates (base, quote, rate, as_of, source) values ('EUR','USD',1.1,current_date,'  ') $$, 'fx_rates_source_check');
insert into cc.fx_rates (base, quote, rate, as_of, source) values ('EUR','USD',1.10,current_date,'Reference rate, recorded by finance'),('EUR','USD',9.99,(current_date + interval '40 days')::date,'Future rate must not be used');
select pg_temp.assert((select converted from cc.consolidate('USD', current_date) where currency = 'EUR') = 220.00, 'documented rate converts exactly');
select pg_temp.assert((select rate_source from cc.consolidate('USD', current_date) where currency = 'EUR') is not null, 'the rate source travels with the number');
select pg_temp.assert((select status from cc.consolidate('USD', current_date) where currency = 'USD') = 'native', 'native currency is untouched');

-- ===== AR / AP aging =====
insert into cc.invoices (number, counterparty, direction, amount, currency, issued_on, due_on, status) values
 ('AR-1','Client','receivable',100,'USD',current_date - 40,current_date - 10,'open'),('AP-1','Vendor','payable',50,'USD',current_date,current_date + 10,'open'),('AR-2','Client','receivable',999,'USD',current_date - 80,current_date - 70,'paid');
select pg_temp.assert((select days_1_30 from cc.v_ar_ap_aging where direction = 'receivable' and currency = 'USD') = 100, 'overdue receivable is bucketed');
select pg_temp.assert((select current_amount from cc.v_ar_ap_aging where direction = 'payable') = 50, 'upcoming payable is current');
select pg_temp.assert((select total_open from cc.v_ar_ap_aging where direction = 'receivable') = 100, 'paid invoices are excluded');
insert into cc.reports (kind, period_start, period_end, payload, sources) values ('annual','2025-01-01','2025-12-31','{}','{}');

-- ===== HR =====
insert into cc.hr_employees (id, staff_user_id, full_name) values ('00000000-0000-0000-0000-0000000000a1', pg_temp.uid(6), 'Dev One'),('00000000-0000-0000-0000-0000000000a2', null, 'Lead Two'),('00000000-0000-0000-0000-0000000000a3', pg_temp.uid(4), 'HR Three');
update cc.hr_employees set manager_id = '00000000-0000-0000-0000-0000000000a2' where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.fails($$ update cc.hr_employees set manager_id = '00000000-0000-0000-0000-0000000000a1' where id = '00000000-0000-0000-0000-0000000000a2' $$, 'cycle');
insert into cc.hr_leave_requests (id, employee_id, leave_type, start_date, end_date) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','vacation',current_date,current_date + 3),('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a3','sick',current_date,current_date + 1);
select pg_temp.fails(format($$ select cc.decide_leave(%L, '00000000-0000-0000-0000-0000000000b1', 'approved') $$, pg_temp.uid(6)), 'not permitted');
select pg_temp.fails(format($$ select cc.decide_leave(%L, '00000000-0000-0000-0000-0000000000b2', 'approved') $$, pg_temp.uid(4)), 'your own leave');
select pg_temp.fails(format($$ select cc.decide_leave(%L, '00000000-0000-0000-0000-0000000000b1', 'rejected') $$, pg_temp.uid(4)), 'rejection reason');
select cc.decide_leave(pg_temp.uid(4), '00000000-0000-0000-0000-0000000000b1', 'approved');
select pg_temp.assert((select status from cc.hr_leave_requests where id = '00000000-0000-0000-0000-0000000000b1') = 'approved', 'HR can approve someone else''s leave');
select pg_temp.fails($$ insert into cc.hr_leave_requests (employee_id, leave_type, start_date, end_date) values ('00000000-0000-0000-0000-0000000000a1','sick',current_date,current_date - 1) $$, 'hr_leave_requests_check');

-- ===== documents =====
insert into cc.documents (id, title, category, confidentiality) values ('00000000-0000-0000-0000-0000000000c1','NDA','agreement','confidential');
insert into cc.document_versions (document_id, version, storage_path, filename, mime, size_bytes, sha256) values ('00000000-0000-0000-0000-0000000000c1',1,'c1/v1.pdf','nda.pdf','application/pdf',1000,repeat('a',64));
select pg_temp.fails($$ update cc.document_versions set filename = 'x' $$, 'append-only');
select pg_temp.fails($$ delete from cc.document_versions $$, 'append-only');
select pg_temp.fails($$ insert into cc.document_versions (document_id, version, storage_path, filename, mime, size_bytes, sha256) values ('00000000-0000-0000-0000-0000000000c1',2,'c1/v2.html','x.html','text/html',10,repeat('a',64)) $$, 'document_versions_mime_check');
select pg_temp.fails($$ insert into cc.document_versions (document_id, version, storage_path, filename, mime, size_bytes, sha256) values ('00000000-0000-0000-0000-0000000000c1',3,'c1/v3.pdf','big.pdf','application/pdf',20000000,repeat('a',64)) $$, 'document_versions_size_bytes_check');

-- ===== engineering monitoring =====
insert into cc.incidents (id, title, severity) values ('00000000-0000-0000-0000-0000000000d1','Payments down','sev1'),('00000000-0000-0000-0000-0000000000d2','Typo on a page','sev3');
select pg_temp.assert((select count(*) from cc.alerts where kind = 'incident' and resolved_at is null) = 1, 'only serious incidents raise an alert');
select pg_temp.assert(exists (select 1 from cc.notifications where user_id = pg_temp.uid(1) and title = 'Critical alert'), 'critical alerts notify the CEO');
update cc.incidents set status = 'resolved', resolved_at = now() where id = '00000000-0000-0000-0000-0000000000d1';
select pg_temp.assert((select count(*) from cc.alerts where kind = 'incident' and resolved_at is null) = 0, 'resolving the incident closes the alert');
insert into cc.deployments (product_id, environment, status) select id, 'production', 'failed' from cc.products where slug = 'finora';
select pg_temp.assert(exists (select 1 from cc.alerts where kind = 'deploy_failed'), 'a failed production deploy raises an alert');

-- ===== customer isolation: support =====
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1'),('00000000-0000-0000-0000-0000000000f2');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', true);
insert into public.support_requests (id, user_id, subject) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1','My question');
select pg_temp.fails($$ insert into public.support_requests (user_id, subject) values ('00000000-0000-0000-0000-0000000000f2','Impersonation') $$, 'row-level security');
insert into public.support_messages (request_id, author_user_id, body) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1','Hello');
select pg_temp.fails($$ insert into public.support_messages (request_id, author_user_id, is_staff, body) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1', true, 'Fake staff reply') $$, 'row-level security');
select pg_temp.fails($$ select 1 from cc.documents $$, 'permission denied');
select pg_temp.fails($$ select 1 from cc.hr_employees $$, 'permission denied');
select pg_temp.fails($$ select 1 from cc.crm_deals $$, 'permission denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f2', true);
select pg_temp.assert((select count(*) from public.support_requests) = 0, 'another customer cannot see the request');
select pg_temp.assert((select count(*) from public.support_messages) = 0, 'another customer cannot see the messages');
select pg_temp.fails($$ insert into public.support_messages (request_id, author_user_id, body) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f2','Intrusion') $$, 'row-level security');
reset role;
update public.support_requests set status = 'closed' where id = '00000000-0000-0000-0000-0000000000e1';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1', true);
select pg_temp.fails($$ insert into public.support_messages (request_id, author_user_id, body) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1','After close') $$, 'row-level security');
reset role;
set local role anon;
select pg_temp.fails($$ select 1 from public.support_requests $$, 'permission denied');
select pg_temp.fails($$ select 1 from cc.inquiries $$, 'permission denied');
reset role;
rollback;
select 'governance tests passed' as result;
