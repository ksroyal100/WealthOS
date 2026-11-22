'use client';
import { useState } from 'react';
import { updatePassword } from '@/lib/auth/actions';

export default function PasswordForm() {
  const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; s: string } | null>(null);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(null); const r = await updatePassword({ password: pw }); setBusy(false); setMsg({ ok: !r.error, s: r.error ?? 'Password updated. Other devices were signed out.' }); if (!r.error) setPw(''); }}>
      <label className="field">New password<input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={12} required className="input" /></label>
      <p className="muted" style={{ fontSize: '.82rem', marginTop: -6 }}>At least 12 characters.</p>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'ok' : 'err'}>{msg.s}</p>}
      <button className="btn" disabled={busy || pw.length < 12}>{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}
