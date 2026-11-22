import PublicForm from '@/components/public-form';
import { submitInquiry } from '@/lib/public/actions';
export const metadata = { title: 'Contact', description: 'Contact WealthOS for business inquiries, partnerships, press and investor questions.', alternates: { canonical: '/contact' } };

export default function Contact() {
  return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 760 }}>
      <div className="head"><h1 className="title" style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Contact and business inquiries</h1><p className="sub">Tell us what you need. Customers with an account can also use <a className="back" href="/account/support">support requests</a>.</p></div>
      <PublicForm action={submitInquiry} submit="Send message">
        <label className="field">Your name<input name="name" required maxLength={120} autoComplete="name" className="input" /></label>
        <label className="field">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="input" /></label>
        <label className="field">Topic<select name="topic" className="input" defaultValue="general"><option value="general">General</option><option value="partnership">Partnership</option><option value="press">Press</option><option value="investor">Investor</option><option value="careers">Careers</option><option value="support">Support</option></select></label>
        <label className="field">Message<textarea name="message" required minLength={10} maxLength={4000} rows={6} className="input" style={{ padding: 12, minHeight: 140 }} /></label>
        <div aria-hidden="true" style={{ position: 'absolute', left: -9999 }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <p style={{ fontSize: '.85rem', color: 'var(--soft)' }}>We use your details only to reply. See our <a className="back" href="/privacy">Privacy Policy</a>.</p>
      </PublicForm>
    </div></section>
  );
}
