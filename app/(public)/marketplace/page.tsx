import Link from 'next/link';
import { publicClient } from '@/lib/supabase/public';
import { ProductCard, type CatalogProduct } from '@/components/product-card';
export const revalidate = 300;
export const metadata = { title: 'Products' };

export default async function Marketplace({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const { data } = await publicClient().from('catalog_products').select('slug,name,tagline,category,status').order('sort_order').order('name');
  const all = (data ?? []) as CatalogProduct[];
  const cats = [...new Set(all.map((p) => p.category))];
  const list = category ? all.filter((p) => p.category === category) : all;
  return (
    <section className="sec"><div className="wrap">
      <h1 className="title serif" style={{ fontSize: 'clamp(2rem,4vw,3rem)', margin: 0 }}>Product marketplace</h1>
      <p className="sub" style={{ marginTop: 10 }}>Software and digital products from WealthOS.</p>
      <div className="chips">
        <Link className={`chip ${!category ? 'on' : ''}`} href="/marketplace">All</Link>
        {cats.map((c) => <Link key={c} className={`chip ${category === c ? 'on' : ''}`} href={`/marketplace?category=${encodeURIComponent(c)}`}>{c}</Link>)}
      </div>
      {list.length === 0 ? <p>No products in this category yet.</p> : <div className="grid3">{list.map((p) => <ProductCard key={p.slug} p={p} />)}</div>}
    </div></section>
  );
}
