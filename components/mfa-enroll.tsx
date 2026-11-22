'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';

export default function MfaEnroll() {
  const sb = browserClient();
  const [state, setState] = useState<'loading' | 'off' | 'on' | 'enrolling'>('loading');
  const [factorId, setFactorId] = useState(''); const [qr, setQr] = useState(''); const [secret, setSecret] = useState(''); const [code, setCode] = useState(''); const [msg, setMsg] = useState('');

  async function refresh() {
    const { data } = await sb.auth.mfa.listFactors();
    const v = data?.totp?.find((f) => f.status === 'verified');
    if (v) { setFactorId(v.id); setState('on'); } else setState('off');
  }
  useEffect(() => { refresh(); }, []);

  async function start() {
    setMsg('');
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });   // clear half-finished attempts
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'WealthOS' });
    if (error || !data) return setMsg('Could not start setup. Please try again.');
    setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret); setState('enrolling');
  }
  async function verify() {
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) return setMsg('Could not verify. Try again.');
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    if (v.error) return setMsg('That code is not valid. Use the latest code from your app.');
    setCode(''); setMsg(''); setState('on');
  }
  async function turnOff() {
    const { error } = await sb.auth.mfa.unenroll({ factorId });
    if (error) return setMsg('Could not turn off. Sign in again, then retry.');
    setState('off');
  }

  if (state === 'loading') return <div className="skel" style={{ height: 48 }} aria-hidden="true" />;
  return (
    <div>
      {state === 'on' && (<><p><span className="badge b-live">On</span> Two-step verification protects your account.</p><button className="btn" onClick={turnOff}>Turn off</button></>)}
      {state === 'off' && (<><p className="muted" style={{ marginTop: 0 }}>Add a second step at sign-in using an authenticator app (such as Google Authenticator, 1Password or Authy).</p><button className="btn solid" onClick={start}>Set up two-step verification</button></>)}
      {state === 'enrolling' && (
        <div>
          <p style={{ marginTop: 0 }}>1. Scan this code with your authenticator app.</p>
          {qr && <img src={qr} alt="QR code for your authenticator app" width={170} height={170} style={{ background: '#fff', padding: 8, borderRadius: 12 }} />}
          <p className="muted" style={{ fontSize: '.85rem' }}>Cannot scan? Enter this key manually: <code>{secret}</code></p>
          <p>2. Enter the 6-digit code it shows.</p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="input" style={{ maxWidth: 200 }} aria-label="6-digit code" />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}><button className="btn solid" onClick={verify} disabled={code.length !== 6}>Turn on</button><button className="btn" onClick={() => setState('off')}>Cancel</button></div>
        </div>)}
      {msg && <p role="alert" className="err">{msg}</p>}
    </div>
  );
}
