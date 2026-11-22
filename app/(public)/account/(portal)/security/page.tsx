import { requireCustomer } from '@/lib/account/session';
import { signOutHere, signOutEverywhere } from '@/lib/auth/actions';
import PasswordForm from '@/components/password-form';
import MfaEnroll from '@/components/mfa-enroll';

export const metadata = { title: 'Security', robots: { index: false } };

export default async function Security() {
  await requireCustomer();
  return (
    <div className="stack">
      <div className="pgreet"><h1>Security</h1><p className="muted">Keep your account safe.</p></div>
      <div className="panel"><h2>Two-step verification</h2><MfaEnroll /></div>
      <div className="panel"><h2>Password</h2><PasswordForm /></div>
      <div className="panel"><h2>Sessions</h2><p className="muted" style={{ marginTop: 0 }}>Signed in somewhere you do not trust? Sign out everywhere.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><form action={signOutHere}><button className="btn">Sign out of this device</button></form><form action={signOutEverywhere}><button className="btn">Sign out of all devices</button></form></div></div>
    </div>
  );
}
