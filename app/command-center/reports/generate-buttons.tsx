'use client';
import { useState } from 'react';

export default function GenerateButtons() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function run(kind: string, format: 'json' | 'text') {
    setBusy(true); setMsg('');
    const res = await fetch('/api/cc/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, format }) });
    setBusy(false);
    if (!res.ok) return setMsg('Could not generate the report.');
    if (format === 'text') { const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = `wealthos-${kind}.txt`; a.click(); URL.revokeObjectURL(url); }
    else window.location.reload();
  }
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {['daily', 'weekly', 'monthly', 'annual'].map((k) => (
        <span key={k} className="flex overflow-hidden rounded border">
          <button disabled={busy} onClick={() => run(k, 'json')} className="bg-[#0E1B2C] px-3 py-2 text-white">Generate {k}</button>
          <button disabled={busy} onClick={() => run(k, 'text')} className="px-3 py-2">Download</button></span>))}
      {msg && <span role="alert" className="text-red-700">{msg}</span>}
    </div>
  );
}
