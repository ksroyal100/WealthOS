import Link from 'next/link';
import { listCms, fmtLong } from '@/lib/public-data';
export const revalidate = 300;
export const metadata = { title: 'Newsroom', description: 'News, announcements and press releases from WealthOS.', alternates: { canonical: '/newsroom' } };

export default async function Newsroom() {
  const items = await listCms(['announcement', 'press_release'], { limit: 100 });
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Newsroom</h1><p className="sub">Announcements and press releases from WealthOS.</p></div>
      {items.length === 0 ? <div className="emptystate"><b>No announcements yet</b>Company news and press releases will appear here when they are published.</div> : (
        <ul className="news">{items.map((n: any) => (<li key={n.type + n.slug}><time dateTime={n.published_at}>{fmtLong(n.published_at)}</time><div><div style={{ color: 'var(--acc)', fontWeight: 600, fontSize: '.85rem' }}>{n.type === 'press_release' ? 'Press release' : 'Announcement'}</div><h2 style={{ fontFamily: 'Source Serif 4 Variable, Georgia, serif', fontSize: '1.4rem', margin: '2px 0 6px' }}><Link href={`/newsroom/${n.slug}`} style={{ textDecoration: 'none' }}>{n.title}</Link></h2>{n.summary && <p>{n.summary}</p>}</div></li>))}</ul>)}
    </div></section>
  );
}
