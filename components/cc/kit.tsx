import Link from 'next/link';

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (<div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">{title}</h1>{desc && <p className="mt-1.5 max-w-prose text-[15px] leading-6 text-slate-600">{desc}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>);
}
export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (<section className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.04)]"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-[15px] font-semibold tracking-tight text-[#1D1D1F]">{title}</h2>{aside}</div>{children}</section>);
}
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (<div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center"><p className="font-medium">{title}</p>{hint && <p className="mt-1 text-sm text-slate-600">{hint}</p>}{action && <div className="mt-3">{action}</div>}</div>);
}
const TONE: Record<string, string> = { good: 'bg-emerald-100 text-emerald-900', warn: 'bg-amber-100 text-amber-900', bad: 'bg-red-100 text-red-900', neutral: 'bg-slate-100 text-slate-800' };
export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONE }) { return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>; }
export const toneFor = (s: string) => (['active', 'approved', 'published', 'done', 'resolved', 'closed', 'released', 'success', 'won', 'hired', 'live', 'paid'].includes(s) ? 'good' : ['pending', 'in_review', 'open', 'investigating', 'planned', 'draft', 'new', 'screening', 'interview', 'proposal', 'negotiation', 'lead', 'qualified'].includes(s) ? 'warn' : ['rejected', 'failed', 'terminated', 'lost', 'expired', 'rolled_back', 'sev1', 'sev2'].includes(s) ? 'bad' : 'neutral') as keyof typeof TONE;

export function FilterBar({ q, status, statuses, extra }: { q?: string; status?: string; statuses?: string[]; extra?: React.ReactNode }) {
  return (
    <form role="search" className="mb-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">Search<input name="q" defaultValue={q ?? ''} className="mt-1 block rounded-xl border border-slate-300 p-2.5" /></label>
      {statuses && <label className="text-sm">Status<select name="status" defaultValue={status ?? ''} className="mt-1 block rounded-xl border border-slate-300 p-2.5"><option value="">All</option>{statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></label>}
      {extra}
      <button className="rounded-full bg-[#0A7A5C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#086649]">Apply</button>
    </form>
  );
}

export function Table({ caption, head, children, empty }: { caption: string; head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.04)]">
      <table className="w-full text-left text-sm"><caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50/80"><tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 text-[13px] font-semibold text-slate-600">{h}</th>)}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={head.length} className="px-3 py-8 text-center text-slate-600">Nothing to show yet.</td></tr> : children}</tbody></table>
    </div>
  );
}
export const Td = ({ children, className = '', title }: { children?: React.ReactNode; className?: string; title?: string }) => <td title={title} className={`border-t border-slate-100 px-4 py-3 align-top ${className}`}>{children}</td>;
export const SubNav = ({ items, current }: { items: [string, string][]; current: string }) => (
  <nav aria-label="Section" className="mb-5 flex flex-wrap gap-2 text-sm">{items.map(([l, h]) => <Link key={h} href={h} aria-current={current === h ? 'page' : undefined} className={`rounded-full px-4 py-1.5 transition ${current === h ? 'bg-[#1D1D1F] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'}`}>{l}</Link>)}</nav>
);
export const inp = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15 disabled:bg-slate-50';
export function F({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) { return <label className={`block text-sm ${span === 2 ? 'md:col-span-2' : span === 3 ? 'md:col-span-3' : ''}`}>{label}{children}</label>; }
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '');
