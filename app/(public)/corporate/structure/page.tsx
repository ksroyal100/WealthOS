import { getOrgUnits } from '@/lib/public-data';
export const revalidate = 300;
export const metadata = { title: 'Corporate structure', description: 'The corporate structure of WealthOS.', alternates: { canonical: '/corporate/structure' } };

function Branch({ units, parent }: { units: any[]; parent: string | null }) {
  const kids = units.filter((u) => (u.parent_slug ?? null) === parent);
  if (kids.length === 0) return null;
  return (<ul style={{ listStyle: 'none', paddingLeft: parent ? 24 : 0, borderLeft: parent ? '1px solid var(--line)' : 0 }}>{kids.map((u) => (
    <li key={u.slug} style={{ padding: '10px 0' }}><b>{u.name}</b> <span style={{ color: 'var(--soft)', fontSize: '.9rem' }}>{String(u.kind).replace('_', ' ')}</span>
      {u.legal_name && <div style={{ fontSize: '.92rem' }}>Registered entity: {u.legal_name}{u.jurisdiction ? `, ${u.jurisdiction}` : ''}</div>}
      {u.description && <div style={{ color: 'var(--soft)' }}>{u.description}</div>}<Branch units={units} parent={u.slug} /></li>))}</ul>);
}

export default async function Structure() {
  const units = await getOrgUnits();
  const roots = units.filter((u: any) => !u.parent_slug || !units.some((x: any) => x.slug === u.parent_slug));
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Corporate structure</h1><p className="sub">WealthOS is the parent company. Business divisions are internal units and are not separate legal entities unless a registered name is shown.</p></div>
      {units.length === 0 ? <div className="emptystate"><b>Corporate structure</b>The corporate structure will be published here once it has been approved.</div> : <div className="article"><Branch units={[...units].map((u: any) => (roots.includes(u) ? { ...u, parent_slug: null } : u))} parent={null} /></div>}
    </div></section>
  );
}
