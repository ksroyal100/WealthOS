import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCmsDoc, fmtLong } from '@/lib/public-data';
import { publicClient } from '@/lib/supabase/public';
import { paragraphs, MEDIA_TOPICS } from '@/lib/cms-routes';
import TopicList from '@/components/topic-list';
export const revalidate = 300;

async function load(slug: string) {
  const c = await getCmsDoc('article', slug);
  if (c) return { title: c.title, summary: c.summary, body: c.body, author: null as string | null, at: c.published_at, label: MEDIA_TOPICS[c.topic ?? ''] ?? 'Article' };
  try { const { data } = await publicClient().from('publications').select('title,summary,body,author,category,published_at').eq('slug', slug).maybeSingle(); if (data) return { title: data.title, summary: data.summary, body: data.body, author: data.author, at: data.published_at, label: String(data.category).replace(/_/g, ' ') }; } catch { /* none */ }
  return null;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  if (MEDIA_TOPICS[slug]) return { title: MEDIA_TOPICS[slug], description: `WealthOS Media: ${MEDIA_TOPICS[slug]}`, alternates: { canonical: `/media/${slug}` } };
  const a = await load(slug);
  return a ? { title: a.title, description: a.summary ?? undefined, alternates: { canonical: `/media/${slug}` }, openGraph: { type: 'article', title: a.title, description: a.summary ?? undefined } } : {};
}
export default async function MediaSlug({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  if (MEDIA_TOPICS[slug]) return <TopicList topic={slug} />;
  const a = await load(slug);
  if (!a) notFound();
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, ...(a.at ? { datePublished: a.at } : {}), ...(a.author ? { author: { '@type': 'Person', name: a.author } } : {}), publisher: { '@type': 'Organization', name: 'WealthOS' } };
  return (
    <article className="sec"><div className="wrap article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/media" className="back">WealthOS Media</Link>
      <div style={{ color: 'var(--acc)', fontWeight: 600, marginTop: 12 }}>{a.label}{a.at ? ` · ${fmtLong(a.at)}` : ''}</div>
      <h1 className="title" style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', margin: '8px 0 12px' }}>{a.title}</h1>
      {a.author && <p style={{ color: 'var(--soft)' }}>By {a.author}</p>}
      {paragraphs(a.body).map((t, i) => <p key={i}>{t}</p>)}
      <p style={{ color: 'var(--soft)', fontSize: '.85rem', marginTop: 40 }}>For general information and education only. Not financial, investment, tax or legal advice.</p>
    </div></article>
  );
}
