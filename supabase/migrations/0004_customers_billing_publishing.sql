-- Customers, billing mirror, publishing, alert de-duplication. ADDITIVE ONLY.

alter table public.publications
  add column if not exists body text,
  add column if not exists author text,
  add column if not exists updated_at timestamptz not null default now();

-- Customer profile: a customer can read and edit ONLY their own row.
create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (length(full_name) <= 120),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
create policy cp_select on public.customer_profiles for select to authenticated using (user_id = auth.uid());
create policy cp_insert on public.customer_profiles for insert to authenticated with check (user_id = auth.uid());
create policy cp_update on public.customer_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.customer_profiles from anon;
grant select, insert, update on public.customer_profiles to authenticated;

-- Stripe customer <-> user mapping. Server-only: no policies, no grants for client roles.
create table public.customer_billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now()
);
alter table public.customer_billing enable row level security;
revoke all on public.customer_billing from anon, authenticated;

-- Read-only mirrors written ONLY by the verified payment webhook (service role).
create table public.customer_subscriptions (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text not null,
  product_slug text, plan_name text,
  status text not null,
  amount numeric(14,2), currency char(3), billing_interval text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.customer_orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text,
  product_slug text, description text,
  amount numeric(14,2) not null, currency char(3) not null,
  status text not null check (status in ('paid','refunded','failed')),
  created_at timestamptz not null default now()
);
alter table public.customer_subscriptions enable row level security;
alter table public.customer_orders enable row level security;
create policy cs_select on public.customer_subscriptions for select to authenticated using (user_id = auth.uid());
create policy co_select on public.customer_orders for select to authenticated using (user_id = auth.uid());
revoke all on public.customer_subscriptions, public.customer_orders from anon, authenticated;
grant select on public.customer_subscriptions, public.customer_orders to authenticated;
create index on public.customer_orders (user_id, created_at desc);
create index on public.customer_subscriptions (user_id);
create index on public.customer_subscriptions (stripe_customer_id);

-- Webhook idempotency + one open alert per (kind, source).
create table cc.stripe_events (id text primary key, type text not null, received_at timestamptz not null default now());
alter table cc.stripe_events enable row level security;
revoke all on cc.stripe_events from anon, authenticated;
grant select, insert, update, delete on cc.stripe_events to service_role;
create unique index alerts_one_open on cc.alerts (kind, coalesce(source, '')) where resolved_at is null;

create index on cc.tasks (due_on) where status <> 'done';
create index on cc.audit_log (at desc);
create index on cc.ledger_entries (status, kind);
