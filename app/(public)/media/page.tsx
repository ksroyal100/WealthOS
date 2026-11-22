import Link from 'next/link';
import { listCms, fmtLong } from '@/lib/public-data';
import { publicClient } from '@/lib/supabase/public';
import { MEDIA_TOPICS } from '@/lib/cms-routes';
export const revalidate = 300;
export const metadata = { title: 'Media', description: 'WealthOS Media: financial education, business, technology and research.', alternates: { canonical: '/media' } };

export default async function Media() {
  const cms = await listCms(['article'], { limit: 30 });
  let pubs: any[] = [];
  try { const { data } = await publicClient().from('publications').select('slug,title,summary,category,published_at').order('published_at', { ascending: false }).limit(30); pubs = data ?? []; } catch { /* none */ }
  const items = [...cms.map((c: any) => ({ slug: c.slug, title: c.title, summary: c.summary, at: c.published_at, label: MEDIA_TOPICS[c.topic ?? ''] ?? 'Article' })), ...pubs.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, at: p.published_at, label: String(p.category).replace(/_/g, ' ') }))].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>WealthOS Media</h1><p className="sub">Educational media: financial education, business and technology insights, and research.</p></div>
      <div className="chips">{Object.entries(MEDIA_TOPICS).map(([k, v]) => <Link key={k} href={`/media/${k}`} className="chip">{v}</Link>)}</div>
      {items.length === 0 ? <div className="emptystate"><b>Nothing published yet</b>Articles and research will appear here when they are approved and published.</div> : (
        <ul className="news">{items.map((n) => (<li key={n.slug}><time dateTime={n.at}>{n.at ? fmtLong(n.at) : ''}</time><div><div style={{ color: 'var(--acc)', fontWeight: 600, fontSize: '.85rem' }}>{n.label}</div><h2 style={{ fontFamily: 'Source Serif 4 Variable, Georgia, serif', fontSize: '1.4rem', margin: '2px 0 6px' }}><Link href={`/media/${n.slug}`} style={{ textDecoration: 'none' }}>{n.title}</Link></h2>{n.summary && <p>{n.summary}</p>}</div></li>))}</ul>)}
    </div></section>
  );
}
