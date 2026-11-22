import { requireCustomer } from '@/lib/account/session';
import { updateProfile, requestDeletion } from '@/lib/account/actions';
import Link from 'next/link';

export const metadata = { title: 'Profile and privacy', robots: { index: false } };

export default async function Profile() {
  const { sb, user } = await requireCustomer();
  const { data: p } = await sb.from('customer_profiles').select('full_name,marketing_opt_in').maybeSingle();
  return (
    <div className="stack">
      <div className="pgreet"><h1>Profile and privacy</h1><p className="muted">{user.email}</p></div>
      <div className="panel"><h2>Your details</h2>
        <form action={updateProfile}>
          <label className="field">Full name<input name="full_name" defaultValue={p?.full_name ?? ''} maxLength={120} className="input" autoComplete="name" /></label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '0 0 18px', fontSize: '.95rem' }}><input type="checkbox" name="marketing_opt_in" defaultChecked={p?.marketing_opt_in ?? false} style={{ width: 20, height: 20 }} /> Send me product news and offers</label>
          <button className="btn solid">Save changes</button>
        </form></div>
      <div className="panel"><h2>Your data</h2><p className="muted" style={{ marginTop: 0 }}>You can ask us to delete your account and data. Our team reviews each request. Read our <Link className="back" href="/privacy">Privacy Policy</Link> for your rights.</p>
        <form action={requestDeletion}><button className="btn">Request account deletion</button></form></div>
    </div>
  );
}
