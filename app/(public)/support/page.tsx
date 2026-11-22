import Link from 'next/link';
import Faq from '@/components/faq';
import { SUPPORT_FAQ } from '@/lib/content';

export const metadata = { title: 'Help center', description: 'Answers about accounts, billing, security and privacy.' };

export default function Support() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 900 }}>
      <div className="head"><h1 className="title">How can we help?</h1><p className="sub">Quick answers about your account, billing, security and privacy.</p></div>
      <div className="helpgrid">
        <Link href="/account" className="helpcard"><b>Manage my account</b><span>Subscriptions, billing, profile</span></Link>
        <Link href="/account/security" className="helpcard"><b>Secure my account</b><span>Password and two-step verification</span></Link>
        <Link href="/privacy" className="helpcard"><b>Privacy and data</b><span>How we handle your information</span></Link>
      </div>
      {SUPPORT_FAQ.map((g) => (<div key={g.title} style={{ marginTop: 44 }}><h2 className="subhead">{g.title}</h2><Faq items={g.items} /></div>))}
      <div className="panel" style={{ marginTop: 56, textAlign: 'center' }}>
        <h2>Still need help?</h2>
        <p className="muted">{email ? 'Email us and we will get back to you.' : 'Contact details will be published here.'}</p>
        {email && <a className="btn solid" href={`mailto:${email}`}>Email support</a>}
      </div>
    </div></section>
  );
}
