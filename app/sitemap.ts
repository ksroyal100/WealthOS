import type { MetadataRoute } from 'next';
import { publicClient } from '@/lib/supabase/public';
import { publicPath } from '@/lib/cms-routes';
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/marketplace', '/media', '/tech', '/about', '/contact', '/pricing', '/support', '/security', '/careers', '/mission', '/leadership', '/governance', '/corporate/structure', '/divisions', '/newsroom', '/research', '/partnerships', '/investors', '/media/financial-education', '/media/business', '/media/technology', '/media/research', '/privacy', '/terms', '/accessibility'].map((p) => ({ url: `${site}${p}` }));
  try {
    const { data } = await publicClient().from('catalog_products').select('slug');
    const { data: pubs } = await publicClient().from('publications').select('slug');
    const { data: cms } = await publicClient().from('cms_published').select('type,slug');
    const cmsUrls = (cms ?? []).map((c: { type: string; slug: string }) => publicPath(c.type, c.slug)).filter((p: string | null): p is string => !!p && !['/careers', '/divisions'].includes(p)).map((p: string) => ({ url: `${site}${p}` }));
    return [...pages, ...cmsUrls, ...(data ?? []).map((p: { slug: string }) => ({ url: `${site}/marketplace/${p.slug}` })), ...(pubs ?? []).map((p: { slug: string }) => ({ url: `${site}/media/${p.slug}` }))];
  } catch { return pages; }
}
