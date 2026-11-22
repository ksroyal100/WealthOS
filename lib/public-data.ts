import { publicClient } from '@/lib/supabase/public';

export type CmsRow = { type: string; slug: string; title: string; summary: string | null; body: string | null; topic: string | null; published_at: string; version: number };
const safe = async <T,>(fn: () => PromiseLike<{ data: T | null }>): Promise<T | null> => { try { return (await fn()).data; } catch { return null; } };

/** Everything the public site shows comes from published, approved records only. A failure shows nothing rather than invented content. */
export const getCmsDoc = (type: string, slug: string) => safe<CmsRow>(() => publicClient().from('cms_published').select('*').eq('type', type).eq('slug', slug).maybeSingle() as any);
export const listCms = async (types: string[], opts: { topic?: string; limit?: number } = {}) => {
  const r = await safe<CmsRow[]>(() => { let q = publicClient().from('cms_published').select('type,slug,title,summary,topic,published_at,version').in('type', types).order('published_at', { ascending: false }).limit(opts.limit ?? 50); if (opts.topic) q = q.eq('topic', opts.topic); return q as any; });
  return r ?? [];
};
export const getLeadership = async () => (await safe<any[]>(() => publicClient().from('public_leadership').select('*') as any)) ?? [];
export const getOrgUnits = async () => (await safe<any[]>(() => publicClient().from('public_org_units').select('*') as any)) ?? [];
export const getProducts = async () => (await safe<any[]>(() => publicClient().from('catalog_products').select('slug,name,tagline,category,status').order('sort_order').order('name') as any)) ?? [];
export const fmtLong = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
