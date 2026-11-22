-- Product listing for ANY kind of product (finance, business, sales, real estate, ...). ADDITIVE ONLY.
alter table public.catalog_products
  add column if not exists category text not null default 'General',
  add column if not exists status text not null default 'live' check (status in ('live','beta','coming_soon')),
  add column if not exists sort_order integer not null default 100;
update public.catalog_products set category = 'Finance', status = 'live', sort_order = 1 where slug = 'finora';
