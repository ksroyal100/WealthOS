import Link from 'next/link';
import { listCms, fmtLong } from '@/lib/public-data';
import { publicClient } from '@/lib/supabase/public';
import { MEDIA_TOPICS } from '@/lib/cms-routes';

const PUB_TOPIC: Record<string, string> = { financial_education: 'financial-education', research: 'research' };

/** Published articles for one WealthOS Media topic: approved CMS articles plus legacy publications in the same topic. */
export default async function TopicList({ topic }: { topic: string }) {
  const cms = await listCms(['article'], { topic, limit: 100 });
  let pubs: any[] = [];
  try { const { data } = await publicClient().from('publications').select('slug,title,summary,category,published_at').order('published_at', { ascending: false }).limit(100); pubs = (data ?? []).filter((p: any) => PUB_TOPIC[p.category] === topic); } catch { /* none */ }
  const items = [...cms.map((c: any) => ({ slug: c.slug, title: c.title, summary: c.summary, at: c.published_at })), ...pubs.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, at: p.published_at }))].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>{MEDIA_TOPICS[topic]}</h1><p className="sub">WealthOS Media</p></div>
      <div className="chips">{Object.entries(MEDIA_TOPICS).map(([k, v]) => <Link key={k} href={`/media/${k}`} className={`chip ${k === topic ? 'on' : ''}`}>{v}</Link>)}</div>
      {items.length === 0 ? <div className="emptystate"><b>Nothing published in {MEDIA_TOPICS[topic]} yet</b>New articles will appear here when they are approved and published.</div> : (
        <ul className="news">{items.map((n) => (<li key={n.slug}><time dateTime={n.at}>{n.at ? fmtLong(n.at) : ''}</time><div><h2 style={{ fontFamily: 'Source Serif 4 Variable, Georgia, serif', fontSize: '1.4rem', margin: '0 0 6px' }}><Link href={`/media/${n.slug}`} style={{ textDecoration: 'none' }}>{n.title}</Link></h2>{n.summary && <p>{n.summary}</p>}</div></li>))}</ul>)}
    </div></section>
  );
}
