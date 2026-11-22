import HomeView from '@/components/home-view';
import type { CatalogProduct } from '@/components/product-card';
import { getProducts, listCms, getLeadership } from '@/lib/public-data';
import { publicClient } from '@/lib/supabase/public';

export const revalidate = 300;

export default async function Home() {
  const [products, news, leaders] = await Promise.all([getProducts(), listCms(['announcement', 'press_release'], { limit: 3 }), getLeadership()]);
  let posts: any[] = [];
  try { const { data } = await publicClient().from('publications').select('slug,title,summary,category,published_at').order('published_at', { ascending: false }).limit(3); posts = data ?? []; } catch { /* none */ }
  return <HomeView products={products as CatalogProduct[]} posts={posts} news={news as any} leaders={leaders.slice(0, 6)} />;
}
