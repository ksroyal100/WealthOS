import Link from 'next/link';
import { getOrgUnits, listCms } from '@/lib/public-data';
export const revalidate = 300;
export const metadata = { title: 'Business divisions', description: 'The business divisions of WealthOS.', alternates: { canonical: '/divisions' } };

export default async function Divisions() {
  const [units, docs] = await Promise.all([getOrgUnits(), listCms(['division'])]);
  const extra = units.filter((u: any) => u.kind === 'division' && !['technology', 'media'].includes(u.slug));
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Business divisions</h1><p className="sub">WealthOS operates through a technology business and a media business.</p></div>
      <div className="cols" style={{ ['--n' as any]: 2 }}>
        <div className="col"><h3>WealthOS Technology</h3><p>Digital products, software platforms and financial technology solutions.</p><Link className="more" href="/tech">Explore technology</Link></div>
        <div className="col"><h3>WealthOS Media</h3><p>Educational media: financial education, business and technology insights, and research.</p><Link className="more" href="/media">Explore media</Link></div>
      </div>
      {(extra.length > 0 || docs.length > 0) && <div style={{ marginTop: 48 }} className="cols" >{[...extra.map((u: any) => ({ key: u.slug, t: u.name, d: u.description })), ...docs.map((d: any) => ({ key: d.slug, t: d.title, d: d.summary }))].map((x) => <div className="col" key={x.key}><h3>{x.t}</h3><p>{x.d}</p></div>)}</div>}
    </div></section>
  );
}
