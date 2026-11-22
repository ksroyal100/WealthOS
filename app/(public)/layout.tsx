import './public.css';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import RevealObserver from '@/components/reveal-observer';
import { publicClient } from '@/lib/supabase/public';
import { unstable_cache } from 'next/cache';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const ld = { '@context': 'https://schema.org', '@type': 'Organization', name: 'WealthOS', url: site, description: 'A global media and technology company building software and digital products.' };

// Header menu data is public and changes rarely: cache it so pages do not pay a database round trip on every request.
const headerProducts = unstable_cache(async () => {
  const { data, error } = await publicClient().from('catalog_products').select('slug,name,tagline,status').order('sort_order').order('name').limit(8);
  if (error) throw error;                                 // errors are never cached
  return data ?? [];
}, ['header-products'], { revalidate: 300, tags: ['catalog'] });

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let products: { slug: string; name: string; tagline: string | null; status: string }[] = [];
  try { products = await headerProducts(); } catch { /* menu simply shows no products */ }
  return (
    <div className="wos min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <a href="#main" className="skip">Skip to main content</a>
      <SiteHeader products={products} />
      <main id="main">{children}</main>
      <SiteFooter year={new Date().getFullYear()} />
      <RevealObserver />
    </div>
  );
}
