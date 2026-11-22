'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';

export default function Mfa() {
  const sb = browserClient();
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (verified) { setFactorId(verified.id); return; }
      const enrol = await sb.auth.mfa.enroll({ factorType: 'totp' });
      if (enrol.data) { setFactorId(enrol.data.id); setQr(enrol.data.totp.qr_code); }
    })();
  }, []);

  async function verify() {
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) return setErr('Could not start verification.');
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    if (v.error) setErr('That code is not valid. Try the latest code.'); else window.location.href = '/command-center';
  }
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4 p-5">
      <h1 className="text-xl font-semibold">Two-step verification</h1>
      {qr && <><p className="text-sm">Scan this with your authenticator app, then enter the code.</p><img src={qr} alt="Authenticator QR code" className="h-44 w-44" /></>}
      <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded border p-2" aria-label="6-digit code" />
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      <button onClick={verify} className="w-full rounded bg-[#0E1B2C] p-2 text-white">Verify</button>
    </div>
  );
}
