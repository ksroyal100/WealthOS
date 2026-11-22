'use client';
import { useState } from 'react';
export default function BillingButton() {
  const [err, setErr] = useState('');
  return (<div><button className="btn" onClick={async () => { setErr(''); const r = await fetch('/api/account/billing-portal', { method: 'POST' }); const j = await r.json().catch(() => ({})); if (j.url) window.location.href = j.url; else setErr(j.error ?? 'Something went wrong'); }}>Manage billing and invoices</button>{err && <p role="alert" className="err" style={{ fontSize: '.88rem' }}>{err}</p>}</div>);
}
