import Link from 'next/link';
export const revalidate = 3600;
export const metadata = { title: 'Security and trust center', description: 'How WealthOS protects your account and data.', alternates: { canonical: '/security' } };

const ITEMS: [string, string][] = [
  ['Encrypted connections', 'All traffic to WealthOS uses HTTPS, and browsers are instructed to always use it.'],
  ['Protected sign-in', 'Passwords are hashed by our authentication provider and must be at least 12 characters. Sign-in attempts are rate limited and repeated failures raise alerts.'],
  ['Two-step verification', 'Available to every customer in Account settings. Required for our own staff.'],
  ['Your data stays yours', 'Row-level security in the database means each customer can only read their own records. The database enforces this, not just the application.'],
  ['Payments through Stripe', 'Card details go to Stripe, not to us. WealthOS stores only references such as customer and subscription IDs.'],
  ['Strict internal access', 'Company systems use role-based permissions checked on the server and in the database. Sensitive actions require approval, no one can approve their own request, and every change is written to an append-only audit log.'],
  ['Private documents', 'Confidential files are stored in private storage. Access needs a specific permission, download links last 60 seconds, and each download is logged.'],
  ['Monitoring', 'We watch for failed payments, stale data, serious incidents and suspicious sign-in activity, and alert our team.'],
];

export default function Security() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <section className="sec"><div className="wrap">
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Security and trust center</h1><p className="sub">How WealthOS protects your account and your data.</p></div>
      <div className="bento">{ITEMS.map(([t, d]) => (<div className="tile" key={t}><h2 style={{ fontFamily: 'Source Serif 4 Variable, Georgia, serif', fontSize: '1.3rem', margin: 0 }}>{t}</h2><p style={{ marginTop: 8 }}>{d}</p></div>))}</div>
      <div className="article" style={{ marginTop: 48 }}>
        <h2 className="title" style={{ fontSize: '1.8rem' }}>Where we are today</h2>
        <p>WealthOS has not yet completed formal compliance audits such as SOC 2 or ISO 27001. We will say so here when that changes.</p>
        <h2 className="title" style={{ fontSize: '1.8rem' }}>Report a vulnerability</h2>
        <p>{email ? <>Email <a className="back" href={`mailto:${email}`}>{email}</a> with details. Please give us reasonable time to respond before sharing publicly.</> : 'Security contact details will be published here.'}</p>
        <p><Link className="back" href="/account/security">Secure your own account</Link></p>
      </div>
    </div></section>
  );
}
