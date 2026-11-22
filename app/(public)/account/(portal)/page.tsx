import Link from 'next/link';
import { requireCustomer } from '@/lib/account/session';
import { publicClient } from '@/lib/supabase/public';
import { admin } from '@/lib/supabase/admin';
import { ProductCard, type CatalogProduct } from '@/components/product-card';

export const metadata = { title: 'Account overview', robots: { index: false } };
const usd = (a: string | number | null, c: string | null) => (a == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(Number(a)));
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const safe = (u?: string | null) => (u && /^https:\/\//.test(u) ? u : null);

export default async function Overview() {
  const { sb, user } = await requireCustomer();
  const u = user;
  let { data: profile } = await sb.from('customer_profiles').select('full_name,marketing_opt_in').maybeSingle();
  if (!profile) { const n = (u.user_metadata?.full_name as string | undefined) ?? null; await sb.from('customer_profiles').insert({ user_id: u.id, full_name: n }); profile = { full_name: n, marketing_opt_in: false }; }
  const [{ data: subs }, { data: orders }, { data: factors }, { data: catalog }, { data: s }] = await Promise.all([
    sb.from('customer_subscriptions').select('id,product_slug,plan_name,status,amount,currency,billing_interval,current_period_end').order('updated_at', { ascending: false }),
    sb.from('customer_orders').select('id,description,amount,currency,status,created_at').order('created_at', { ascending: false }).limit(3),
    sb.auth.mfa.listFactors(),
    publicClient().from('catalog_products').select('slug,name,tagline,category,status,app_url').order('sort_order'),
    admin().from('staff_members').select('status').eq('user_id', u.id).maybeSingle(),
  ]);
  const first = (profile?.full_name ?? u.email ?? 'there').split(/[ @]/)[0];
  const active = (subs ?? []).filter((x: any) => ['active', 'trialing'].includes(x.status));
  const mfaOn = !!factors?.totp?.some((f) => f.status === 'verified');
  const steps = [
    { done: !!u.email_confirmed_at, t: 'Confirm your email', href: '/account/profile' },
    { done: !!profile?.full_name, t: 'Add your name', href: '/account/profile' },
    { done: mfaOn, t: 'Turn on two-step verification', href: '/account/security' },
    { done: active.length > 0, t: 'Choose your first product', href: '/marketplace' },
  ];
  const pct = Math.round((steps.filter((x) => x.done).length / steps.length) * 100);
  const owned = new Set(active.map((x: any) => x.product_slug));
  const more = ((catalog ?? []) as any[]).filter((p) => !owned.has(p.slug)).slice(0, 3) as CatalogProduct[];

  return (
    <div className="stack">
      <div className="pgreet"><h1>Welcome back, {first}.</h1><p className="muted">Everything about your WealthOS account, in one place.</p>
        {s?.status === 'active' && <Link className="btn small" href="/command-center">Open Command Center</Link>}</div>

      {pct < 100 && (
        <div className="panel"><div className="rowhead"><h2>Get set up</h2><span className="muted">{pct}% complete</span></div>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress"><i style={{ width: `${pct}%` }} /></div>
          <ul className="checklist">{steps.map((x) => (<li key={x.t} className={x.done ? 'done' : ''}><span className="tick" aria-hidden="true">{x.done ? '✓' : ''}</span>{x.done ? <span>{x.t}</span> : <Link href={x.href}>{x.t}</Link>}</li>))}</ul></div>)}

      <div className="panel"><div className="rowhead"><h2>Your products</h2><Link href="/account/subscriptions" className="back">Manage</Link></div>
        {active.length === 0 ? (<div className="empty"><p><b>No active products yet.</b></p><p className="muted">Browse the marketplace to find a product and start a plan.</p><Link className="btn solid" href="/marketplace">Explore products</Link></div>) : (
          <div className="prodgrid">{active.map((x: any) => { const c = ((catalog ?? []) as any[]).find((p) => p.slug === x.product_slug); const url = safe(c?.app_url); return (
            <div className="prodcard" key={x.id}><b>{c?.name ?? x.plan_name ?? 'Subscription'}</b><span className="muted">{x.plan_name} · {usd(x.amount, x.currency)}{x.billing_interval ? ` / ${x.billing_interval}` : ''}</span><span className="muted">Renews {date(x.current_period_end)}</span>{url && <a className="btn small solid" href={url}>Open app</a>}</div>); })}</div>)}
      </div>

      <div className="cols2s">
        <div className="panel"><div className="rowhead"><h2>Recent payments</h2><Link href="/account/billing" className="back">All</Link></div>
          {(orders ?? []).length === 0 ? <p className="muted">No payments yet.</p> : (orders ?? []).map((o: any) => (<div className="rowline" key={o.id}><span>{o.description ?? 'Payment'} <span className="muted">{date(o.created_at)}</span></span><span>{usd(o.amount, o.currency)}</span></div>))}</div>
        <div className="panel"><div className="rowhead"><h2>Security</h2><Link href="/account/security" className="back">Review</Link></div>
          <div className="rowline"><span>Two-step verification</span><span className={`badge ${mfaOn ? 'b-live' : 'b-beta'}`}>{mfaOn ? 'On' : 'Off'}</span></div>
          <div className="rowline"><span>Email</span><span className={`badge ${u.email_confirmed_at ? 'b-live' : 'b-beta'}`}>{u.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}</span></div></div>
      </div>

      {more.length > 0 && (<div><h2 className="subhead">Explore more from WealthOS</h2><div className="grid3">{more.map((p) => <ProductCard key={p.slug} p={p} />)}</div></div>)}
    </div>
  );
}
