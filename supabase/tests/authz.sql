-- Run on a STAGING database after the migrations. Raises an exception on the first failed assertion; rolls back.
begin;
create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$ begin if not cond then raise exception 'FAILED: %', msg; end if; end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2'),('00000000-0000-0000-0000-0000000000a3'),('00000000-0000-0000-0000-0000000000a4');
insert into cc.staff_members (user_id, full_name, status) values
 ('00000000-0000-0000-0000-0000000000a1','CEO T','active'),('00000000-0000-0000-0000-0000000000a2','CFO T','active'),
 ('00000000-0000-0000-0000-0000000000a3','Dev T','active'),('00000000-0000-0000-0000-0000000000a4','Gone T','deactivated');
insert into cc.staff_roles (user_id, role_id) select u, r.id from (values ('00000000-0000-0000-0000-0000000000a1'::uuid,'ceo'),('00000000-0000-0000-0000-0000000000a2','cfo'),('00000000-0000-0000-0000-0000000000a3','developer'),('00000000-0000-0000-0000-0000000000a4','ceo')) v(u,k) join cc.roles r on r.key=v.k;

select pg_temp.assert(cc.has_permission('00000000-0000-0000-0000-0000000000a1','finance','approve'), 'ceo can approve finance');
select pg_temp.assert(cc.has_permission('00000000-0000-0000-0000-0000000000a2','finance','approve'), 'cfo can approve finance');
select pg_temp.assert(not cc.has_permission('00000000-0000-0000-0000-0000000000a3','finance','view'), 'developer cannot view finance');
select pg_temp.assert(not cc.has_permission('00000000-0000-0000-0000-0000000000a3','banking','view'), 'developer cannot view banking');
select pg_temp.assert(not cc.has_permission('00000000-0000-0000-0000-0000000000a2','team','delete'), 'cfo cannot delete team');
select pg_temp.assert(not cc.has_permission('00000000-0000-0000-0000-0000000000a4','dashboard','view'), 'deactivated ceo has nothing');
select pg_temp.assert(not cc.has_permission('00000000-0000-0000-0000-0000000000ff','dashboard','view'), 'unknown user has nothing');

-- audit log is immutable
insert into cc.audit_log (action, resource, outcome) values ('test','test','success');
do $$ begin begin update cc.audit_log set action='x'; raise exception 'FAILED: audit update allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
do $$ begin begin delete from cc.audit_log; raise exception 'FAILED: audit delete allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;

-- approvals: no self-approval, limit enforced, success path audited
insert into cc.approval_limits values ('00000000-0000-0000-0000-0000000000a2','USD',1000.00);
insert into cc.approvals (id, kind, subject, amount, currency, requested_by) values
 ('00000000-0000-0000-0000-00000000b001','vendor_payment','Small',500,'USD','00000000-0000-0000-0000-0000000000a3'),
 ('00000000-0000-0000-0000-00000000b002','vendor_payment','Large',5000,'USD','00000000-0000-0000-0000-0000000000a3'),
 ('00000000-0000-0000-0000-00000000b003','vendor_payment','Own',10,'USD','00000000-0000-0000-0000-0000000000a2');
do $$ begin begin perform cc.decide_approval('00000000-0000-0000-0000-00000000b003','00000000-0000-0000-0000-0000000000a2','approved'); raise exception 'FAILED: self-approval allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
do $$ begin begin perform cc.decide_approval('00000000-0000-0000-0000-00000000b002','00000000-0000-0000-0000-0000000000a2','approved'); raise exception 'FAILED: over-limit approval allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
do $$ begin begin perform cc.decide_approval('00000000-0000-0000-0000-00000000b001','00000000-0000-0000-0000-0000000000a3','approved'); raise exception 'FAILED: developer approval allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
select cc.decide_approval('00000000-0000-0000-0000-00000000b001','00000000-0000-0000-0000-0000000000a2','approved');
select pg_temp.assert((select status from cc.approvals where id='00000000-0000-0000-0000-00000000b001')='approved','within-limit approval succeeds');
select pg_temp.assert(exists(select 1 from cc.audit_log where resource='approval' and record_id='00000000-0000-0000-0000-00000000b001'),'approval audited');

-- self role grant blocked
do $$ begin begin insert into cc.staff_roles (user_id, role_id, granted_by) select '00000000-0000-0000-0000-0000000000a3', id, '00000000-0000-0000-0000-0000000000a3' from cc.roles where key='ceo'; raise exception 'FAILED: self grant allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;

-- estimated revenue is not counted as received
insert into cc.ledger_entries (occurred_on, kind, status, amount) values (current_date,'revenue','received',100),(current_date,'revenue','estimated',900);
select pg_temp.assert((select gross_revenue from cc.v_monthly_financials limit 1)=100.00,'estimated excluded from gross');


-- customers: strict row isolation, no write access to billing mirrors, no access to internal data
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1'),('00000000-0000-0000-0000-0000000000c2');
insert into public.customer_orders (id, user_id, amount, currency, status) values
 ('ord_1','00000000-0000-0000-0000-0000000000c1',9.99,'USD','paid'),('ord_2','00000000-0000-0000-0000-0000000000c2',19.99,'USD','paid');
insert into public.customer_subscriptions (id, user_id, stripe_customer_id, status) values
 ('sub_1','00000000-0000-0000-0000-0000000000c1','cus_1','active'),('sub_2','00000000-0000-0000-0000-0000000000c2','cus_2','active');
insert into public.customer_billing (user_id, stripe_customer_id) values ('00000000-0000-0000-0000-0000000000c1','cus_1');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1', true);
select pg_temp.assert((select count(*) from public.customer_orders)=1,'customer sees only own orders');
select pg_temp.assert((select count(*) from public.customer_subscriptions)=1,'customer sees only own subscriptions');
do $$ begin begin insert into public.customer_orders (id,user_id,amount,currency,status) values ('x','00000000-0000-0000-0000-0000000000c1',1,'USD','paid'); raise exception 'FAILED: customer wrote an order'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
do $$ begin begin update public.customer_subscriptions set status='canceled'; raise exception 'FAILED: customer edited a subscription'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
do $$ begin begin perform 1 from public.customer_billing; raise exception 'FAILED: customer read billing map'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
do $$ begin begin perform 1 from cc.staff_members; raise exception 'FAILED: customer read staff'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
insert into public.customer_profiles (user_id, full_name) values ('00000000-0000-0000-0000-0000000000c1','Own Row');
do $$ begin begin insert into public.customer_profiles (user_id, full_name) values ('00000000-0000-0000-0000-0000000000c2','Other Row'); raise exception 'FAILED: customer wrote another profile'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
reset role;

-- one open alert per kind+source
insert into cc.alerts (severity, kind, message, source) values ('warning','dup_test','a','x');
do $$ begin begin insert into cc.alerts (severity, kind, message, source) values ('warning','dup_test','b','x'); raise exception 'FAILED: duplicate open alert allowed'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;

-- public site cannot read internal data
set local role anon;
do $$ begin begin perform 1 from cc.audit_log; raise exception 'FAILED: anon read cc'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end; end $$;
select pg_temp.assert((select count(*) from public.catalog_products where not published)=0,'anon sees only published products');
reset role;
rollback;
select 'authz tests passed' as result;
