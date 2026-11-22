import { listCms, getCmsDoc } from '@/lib/public-data';
import { paragraphs } from '@/lib/cms-routes';
export const revalidate = 300;
export const metadata = { title: 'Careers', description: 'Careers at WealthOS.', alternates: { canonical: '/careers' } };

export default async function Careers() {
  const list = await listCms(['career'], { limit: 50 });
  const docs = await Promise.all(list.map((j: any) => getCmsDoc('career', j.slug)));
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Careers</h1><p className="sub">Open positions at WealthOS.</p></div>
      {docs.filter(Boolean).length === 0 ? <div className="emptystate"><b>No open positions right now</b>When positions open, they will be listed here.{email && <> You are welcome to introduce yourself at <a className="back" href={`mailto:${email}`}>{email}</a>.</>}</div> : (
        <div className="faq" style={{ maxWidth: 820 }}>{docs.filter(Boolean).map((j: any) => (<details key={j.slug}><summary>{j.title}</summary><div style={{ paddingBottom: 18 }}>{j.summary && <p><b>{j.summary}</b></p>}{paragraphs(j.body).map((t, i) => <p key={i}>{t}</p>)}{email && <p><a className="btn solid" href={`mailto:${email}?subject=${encodeURIComponent(j.title)}`}>Apply by email</a></p>}</div></details>))}</div>)}
    </div></section>
  );
}
