import Link from 'next/link';
import { publicClient } from '@/lib/supabase/public';
import Faq from '@/components/faq';
import { StatusBadge } from '@/components/product-card';

export const revalidate = 300;
export const metadata = { title: 'Pricing', description: 'Plans and pricing for WealthOS products.' };
const usd = (n: number, c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n);

export default async function Pricing() {
  const db = publicClient();
  const [{ data: products }, { data: plans }] = await Promise.all([db.from('catalog_products').select('slug,name,tagline,status').order('sort_order'), db.from('catalog_plans').select('*').order('price')]);
  const withPlans = (products ?? []).filter((p: any) => (plans ?? []).some((pl: any) => pl.product_slug === p.slug));
  return (
    <>
      <section className="sec"><div className="wrap">
        <div className="head"><h1 className="title">Simple, honest pricing.</h1><p className="sub">Clear plans for every WealthOS product. Free options where they make sense, and no surprises.</p></div>
        {withPlans.length === 0 ? (
          <div className="panel empty" style={{ maxWidth: 640, margin: '0 auto' }}><p><b>Pricing will appear here as plans are published.</b></p><p className="muted">In the meantime, explore our products.</p><Link className="btn solid" href="/marketplace">Explore products</Link></div>
        ) : withPlans.map((p: any) => (
          <div key={p.slug} style={{ marginBottom: 56 }}>
            <div className="rowhead"><h2 style={{ fontSize: '1.8rem', letterSpacing: '-.03em', margin: 0 }}><Link href={`/marketplace/${p.slug}`}>{p.name}</Link> <StatusBadge status={p.status} /></h2></div>
            <div className="grid3" style={{ marginTop: 18 }}>
              {(plans ?? []).filter((pl: any) => pl.product_slug === p.slug).map((pl: any) => (
                <div className="pcard" key={pl.id}><h3 style={{ fontSize: '1.3rem' }}>{pl.name}</h3>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-.03em' }}>{pl.billing_interval === 'free' ? 'Free' : usd(Number(pl.price), pl.currency)}<span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}>{pl.billing_interval === 'month' || pl.billing_interval === 'year' ? ` / ${pl.billing_interval}` : ''}</span></div>
                  <ul style={{ paddingLeft: 20, flex: 1 }}>{pl.features.map((f: string) => <li key={f}>{f}</li>)}</ul>
                  <Link className="btn solid" href={`/marketplace/${p.slug}`}>See details</Link></div>))}
            </div>
          </div>))}
      </div></section>
      <section className="sec tint"><div className="wrap" style={{ maxWidth: 820 }}>
        <div className="head"><h2 className="title" style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)' }}>Billing questions</h2></div>
        <Faq items={[
          { q: 'Which currency do you charge in?', a: 'Prices are shown in U.S. dollars unless a plan says otherwise.' },
          { q: 'How do I cancel?', a: 'Open Account, then Subscriptions, and use the secure billing portal.' },
          { q: 'Who processes payments?', a: 'Stripe. WealthOS never stores your full card number.' },
        ]} />
      </div></section>
    </>
  );
}
