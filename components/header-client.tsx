'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import { signOutHere } from '@/lib/auth/actions';

type Me = { email: string; name: string; isStaff: boolean };
export type MenuProduct = { slug: string; name: string; tagline: string | null; status: string };
type Group = { key: string; label: string; items: { href: string; label: string; note?: string | null }[]; all?: { href: string; label: string } };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join('') || '?';

export default function HeaderClient({ products }: { products: MenuProduct[] }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const groups: Group[] = [
    { key: 'corporate', label: 'Corporate', items: [{ href: '/about', label: 'About us' }, { href: '/mission', label: 'Our mission' }, { href: '/leadership', label: 'Leadership' }, { href: '/governance', label: 'Governance' }, { href: '/corporate/structure', label: 'Corporate structure' }, { href: '/careers', label: 'Careers' }] },
    { key: 'media', label: 'Media', items: [{ href: '/media/financial-education', label: 'Financial Education' }, { href: '/media/business', label: 'Business' }, { href: '/media/technology', label: 'Technology' }, { href: '/media/research', label: 'Research' }, { href: '/newsroom', label: 'Newsroom' }] },
    { key: 'technology', label: 'Technology', items: [...products.slice(0, 5).map((p) => ({ href: `/marketplace/${p.slug}`, label: p.name, note: p.tagline })), { href: '/tech', label: 'Digital platforms' }] },
  ];

  useEffect(() => {
    let alive = true; const sb = browserClient();
    async function load() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { if (alive) { setMe(null); setReady(true); } return; }
      try { const r = await fetch('/api/me', { cache: 'no-store' }); if (alive) setMe(r.ok ? await r.json() : null); } catch { if (alive) setMe(null); }
      if (alive) setReady(true);
    }
    load();
    const { data: sub } = sb.auth.onAuthStateChange(() => { load(); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { const h = root.current?.closest('header'); const on = () => h?.setAttribute('data-scrolled', String(window.scrollY > 8)); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  const close = () => setOpen(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  return (
    <div className="wrap bar" ref={root}>
      <Link href="/" className="logo" onClick={close}><span className="mark" aria-hidden="true" />WealthOS</Link>
      <nav className="main desk" aria-label="Main">
        {groups.map((g) => (
          <div className="dd" key={g.key}>
            <button type="button" className="ddbtn" aria-expanded={open === g.key} aria-haspopup="true" onClick={() => toggle(g.key)}>{g.label} <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
            {open === g.key && (<div className="ddpanel list" role="menu">{g.items.map((i) => (<Link role="menuitem" key={i.href} href={i.href} onClick={close} className="ddrow"><span><b>{i.label}</b>{i.note && <small>{i.note}</small>}</span></Link>))}</div>)}
          </div>))}
        <Link href="/marketplace">Marketplace</Link><Link href="/support">Support</Link>
      </nav>
      <div className="head-cta">
        {!ready ? <span className="hskel" aria-hidden="true" /> : me ? (
          <div className="dd">
            <button type="button" className="acct" aria-expanded={open === 'account'} aria-haspopup="true" onClick={() => toggle('account')}><span className="avatar" aria-hidden="true">{initials(me.name)}</span><span className="acctname">{me.name.split(' ')[0]}</span></button>
            {open === 'account' && (
              <div className="ddpanel right" role="menu">
                <div className="ddhead"><b>{me.name}</b><small>{me.email}</small></div>
                <Link role="menuitem" href="/account" onClick={close}>Account overview</Link><Link role="menuitem" href="/account/subscriptions" onClick={close}>Subscriptions</Link><Link role="menuitem" href="/account/billing" onClick={close}>Billing and orders</Link><Link role="menuitem" href="/account/support" onClick={close}>Support requests</Link><Link role="menuitem" href="/account/security" onClick={close}>Security</Link>
                {me.isStaff && <Link role="menuitem" href="/command-center" onClick={close} className="staff">Command Center</Link>}
                <form action={signOutHere}><button role="menuitem" className="signout">Sign out</button></form>
              </div>)}
          </div>
        ) : (<><Link href="/account/login" className="link">Sign in</Link><Link href="/account/register" className="btn solid small">Create account</Link></>)}
        <button type="button" className="burger" aria-label="Menu" aria-expanded={open === 'mobile'} onClick={() => toggle('mobile')}><span /><span /></button>
      </div>
      {open === 'mobile' && (
        <div className="mpanel" role="dialog" aria-label="Menu">
          {groups.map((g) => (<div key={g.key}><div className="mgroup">{g.label}</div>{g.items.map((i) => <Link key={i.href} href={i.href} onClick={close} className="sub">{i.label}</Link>)}</div>))}
          <Link href="/marketplace" onClick={close}>Marketplace</Link><Link href="/support" onClick={close}>Support</Link><hr />
          {me ? (<><Link href="/account" onClick={close}>My account</Link>{me.isStaff && <Link href="/command-center" onClick={close}>Command Center</Link>}<form action={signOutHere}><button className="signout">Sign out</button></form></>)
            : (<><Link href="/account/login" onClick={close}>Sign in</Link><Link href="/account/register" onClick={close} className="btn solid">Create account</Link></>)}
        </div>)}
    </div>
  );
}
