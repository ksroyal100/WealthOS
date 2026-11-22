import Link from 'next/link';
import { getCmsDoc } from '@/lib/public-data';
import { paragraphs } from '@/lib/cms-routes';

/** Template for corporate pages whose copy is published through the CMS. If nothing is published, it says so plainly. */
export default async function CmsPage({ slug, title, intro, emptyTitle, emptyText, cta, children }: { slug: string; title: string; intro?: string; emptyTitle: string; emptyText: string; cta?: { href: string; label: string }; children?: React.ReactNode }) {
  const doc = await getCmsDoc('page', slug);
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>{doc?.title ?? title}</h1>{(doc?.summary ?? intro) && <p className="sub">{doc?.summary ?? intro}</p>}</div>
      <div className="article">
        {doc ? paragraphs(doc.body).map((t, i) => <p key={i}>{t}</p>) : <div className="emptystate"><b>{emptyTitle}</b>{emptyText}</div>}
        {children}
        {cta && <p style={{ marginTop: 32 }}><Link href={cta.href} className="btn solid">{cta.label}</Link></p>}
      </div>
    </div></section>
  );
}
