'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: [string, string, string][] = [
  ['Overview', '/account', 'M3 11l9-8 9 8M5 10v10h14V10'],
  ['Subscriptions', '/account/subscriptions', 'M4 7h16v10H4zM4 11h16'],
  ['Billing and orders', '/account/billing', 'M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2z'],
  ['Support requests', '/account/support', 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5'],
  ['Security', '/account/security', 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z'],
  ['Profile and privacy', '/account/profile', 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6'],
  ['Help center', '/support', 'M12 17v.01M9.5 9a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 4M12 22a10 10 0 110-20 10 10 0 010 20z'],
];

export default function AccountNav() {
  const path = usePathname();
  return (
    <nav className="pnav" aria-label="Account">
      {ITEMS.map(([label, href, d]) => {
        const on = href === '/account' ? path === '/account' : path.startsWith(href);
        return (<Link key={href} href={href} aria-current={on ? 'page' : undefined} className={on ? 'on' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg><span>{label}</span></Link>);
      })}
    </nav>
  );
}
