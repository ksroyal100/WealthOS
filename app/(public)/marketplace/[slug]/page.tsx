import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicClient } from '@/lib/supabase/public';
import { StatusBadge } from '@/components/product-card';
import PlanButton from '@/components/plan-button';
export const revalidate = 300;

const usd = (n: number, c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n);
const safe = (u?: string | null) => (u && /^https:\/\//.test(u) ? u : null);

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = publicClient();
  const { data: p } = await db.from('catalog_products').select('*').eq('slug', slug).maybeSingle();
  if (!p) notFound();
  const { data: plans } = await db.from('catalog_plans').select('*').eq('product_slug', slug).order('price');
  const soon = p.status === 'coming_soon';
  return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 820 }}>
      <Link href="/marketplace" className="back">All products</Link>
      <div style={{ marginTop: 18, color: 'var(--soft)' }}>WealthOS presents</div>
      <h1 className="serif" style={{ fontSize: 'clamp(2.2rem,5vw,3.4rem)', margin: '4px 0', fontWeight: 600 }}>{p.name} <StatusBadge status={p.status} /></h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--soft)' }}>{p.tagline}</p>
      {p.description && <p>{p.description}</p>}

      <h2 className="serif" style={{ fontSize: '1.7rem', marginTop: 40 }}>Plans</h2>
      {soon ? <p style={{ color: 'var(--soft)' }}>This product is coming soon. Plans and pricing will be announced at launch.</p>
        : (plans ?? []).length === 0 ? <p style={{ color: 'var(--soft)' }}>Pricing will be announced soon.</p> : (
        <div className="grid3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: 16 }}>
          {(plans ?? []).map((pl) => (
            <div key={pl.id} className="pcard">
              <h3 className="serif" style={{ fontSize: '1.2rem' }}>{pl.name}</h3>
              <div className="serif" style={{ fontSize: '1.8rem' }}>{pl.billing_interval === 'free' ? 'Free' : usd(Number(pl.price), pl.currency)}{pl.billing_interval === 'month' || pl.billing_interval === 'year' ? ` / ${pl.billing_interval}` : ''}</div>
              <ul style={{ paddingLeft: 20 }}>{pl.features.map((f: string) => <li key={f}>{f}</li>)}</ul>
              {safe(pl.checkout_url) && <PlanButton href={safe(pl.checkout_url)!} slug={p.slug} />}
            </div>))}
        </div>)}
      <div id="docs" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 32 }}>
        {!soon && safe(p.app_url) && <a className="btn solid" href={safe(p.app_url)!}>Open app</a>}
        {safe(p.docs_url) && <a className="btn" href={safe(p.docs_url)!}>Documentation</a>}
        {p.support_email && <a className="btn" href={`mailto:${p.support_email}`}>Customer support</a>}
      </div>
    </div></section>
  );
}
