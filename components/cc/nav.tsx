'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavGroup = { title: string; items: [string, string][] };

export default function CcNav({ groups, unread }: { groups: NavGroup[]; unread: number }) {
  const path = usePathname();
  const on = (h: string) => (h === '/command-center' ? path === h : path === h || path.startsWith(h + '/'));
  // The most specific matching link wins, so "Ledger" is not highlighted while viewing "Invoices".
  const all = groups.flatMap((g) => g.items.map(([, h]) => h)).filter(on).sort((a, b) => b.length - a.length)[0];
  return (
    <nav aria-label="Command Center" className="text-sm">
      {groups.map((g) => (
        <div key={g.title} className="mb-4">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-emerald-200/60">{g.title}</div>
          {g.items.map(([label, href]) => (
            <Link key={href} href={href} aria-current={all === href ? 'page' : undefined}
              className={`flex items-center justify-between rounded-xl px-3 py-2 outline-offset-2 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${all === href ? 'bg-white/12 font-medium text-white' : 'text-slate-300'}`}>
              <span>{label}</span>{label === 'Inbox' && unread > 0 && <span className="rounded-full bg-emerald-400 px-2 text-xs font-semibold text-emerald-950">{unread}</span>}
            </Link>))}
        </div>))}
    </nav>
  );
}
