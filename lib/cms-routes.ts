export const PAGE_SLUGS = ['about', 'mission', 'governance', 'partnerships', 'investors'] as const;
export const MEDIA_TOPICS: Record<string, string> = { 'financial-education': 'Financial Education', business: 'Business', technology: 'Technology', research: 'Research' };

/** Where a CMS document will appear on the public website once published. */
export function publicPath(type: string, slug: string): string | null {
  switch (type) {
    case 'page': return (PAGE_SLUGS as readonly string[]).includes(slug) ? `/${slug}` : null;
    case 'announcement': case 'press_release': return `/newsroom/${slug}`;
    case 'article': return `/media/${slug}`;
    case 'career': return '/careers';
    case 'division': return '/divisions';
    default: return null;
  }
}
export const paragraphs = (body?: string | null) => (body ?? '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);   // plain text only: no HTML is ever rendered
