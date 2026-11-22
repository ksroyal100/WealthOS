import { getLeadership } from '@/lib/public-data';
import { paragraphs } from '@/lib/cms-routes';
export const revalidate = 300;
export const metadata = { title: 'Leadership', description: 'The leadership team of WealthOS.', alternates: { canonical: '/leadership' } };

export default async function Leadership() {
  const leaders = await getLeadership();
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Leadership</h1><p className="sub">Only verified and appointed members of the leadership team are listed.</p></div>
      {leaders.length === 0 ? <div className="emptystate"><b>Leadership profiles</b>Profiles will be published here once appointments have been confirmed and verified.</div> : (
        <div className="leaders">{leaders.map((l: any) => (<article className="leader" key={l.key}><h2 style={{ fontFamily: 'Source Serif 4 Variable, Georgia, serif', fontSize: '1.6rem', margin: 0 }}>{l.full_name}</h2><div className="role">{l.title}{l.unit_name ? `, ${l.unit_name}` : ''}</div>{l.headline && <p><b>{l.headline}</b></p>}{paragraphs(l.bio).map((t, i) => <p key={i}>{t}</p>)}</article>))}</div>)}
    </div></section>
  );
}
