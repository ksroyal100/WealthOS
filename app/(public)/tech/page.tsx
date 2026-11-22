import Link from 'next/link';
import { publicClient } from '@/lib/supabase/public';
import { StatusBadge, type CatalogProduct } from '@/components/product-card';
export const revalidate = 300;
export const metadata = { title: 'Tech' };

export default async function Tech() {
  const { data } = await publicClient().from('catalog_products').select('slug,name,tagline,category,status').order('sort_order');
  return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 820 }}>
      <h1 className="title serif" style={{ fontSize: 'clamp(2rem,4vw,3rem)', margin: 0 }}>WealthOS Tech</h1>
      <p className="sub" style={{ marginTop: 10 }}>Software products, SaaS platforms, AI solutions and technology services across finance, business, sales and real estate.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>{((data ?? []) as CatalogProduct[]).map((p) => (
        <li key={p.slug} style={{ padding: '16px 0', borderTop: '1px solid var(--line)' }}>
          <Link href={`/marketplace/${p.slug}`} className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{p.name}</Link> <StatusBadge status={p.status} />
          <div style={{ color: 'var(--soft)' }}>{p.category}. {p.tagline}</div></li>))}</ul>
    </div></section>
  );
}
