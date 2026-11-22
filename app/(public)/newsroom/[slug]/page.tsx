import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCmsDoc, fmtLong } from '@/lib/public-data';
import { paragraphs } from '@/lib/cms-routes';
export const revalidate = 300;

async function load(slug: string) { return (await getCmsDoc('press_release', slug)) ?? (await getCmsDoc('announcement', slug)); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await load((await params).slug);
  return d ? { title: d.title, description: d.summary ?? undefined, alternates: { canonical: `/newsroom/${d.slug}` }, openGraph: { type: 'article', title: d.title, description: d.summary ?? undefined, publishedTime: d.published_at } } : {};
}
export default async function NewsItem({ params }: { params: Promise<{ slug: string }> }) {
  const d = await load((await params).slug);
  if (!d) notFound();
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: d.title, datePublished: d.published_at, publisher: { '@type': 'Organization', name: 'WealthOS' }, ...(d.summary ? { description: d.summary } : {}) };
  return (
    <article className="sec"><div className="wrap article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/newsroom" className="back">Newsroom</Link>
      <div style={{ color: 'var(--acc)', fontWeight: 600, marginTop: 12 }}>{d.type === 'press_release' ? 'Press release' : 'Announcement'} · {fmtLong(d.published_at)}</div>
      <h1 className="title" style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', margin: '8px 0 20px' }}>{d.title}</h1>
      {d.summary && <p className="sub">{d.summary}</p>}
      {paragraphs(d.body).map((t, i) => <p key={i}>{t}</p>)}
    </div></article>
  );
}
