// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';

vi.mock('@/lib/auth/actions', () => ({ signOutHere: async () => {}, signIn: async () => ({}), signUp: async () => ({}), requestReset: async () => ({}), updatePassword: async () => ({}), resendConfirmation: async () => ({}) }));
vi.mock('@/lib/supabase/browser', () => ({ browserClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }), usePathname: () => '/' }));
vi.mock('@/lib/public/actions', () => ({ submitInquiry: async () => ({}), createSupportRequest: async () => ({}), customerReply: async () => ({}) }));

import HomeView from '@/components/home-view';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import Faq from '@/components/faq';
import PublicForm from '@/components/public-form';
import { SUPPORT_FAQ } from '@/lib/content';

async function audit(html: string) {
  document.documentElement.lang = 'en'; document.title = 'Test page'; document.body.innerHTML = html;
  const r = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });   // contrast is verified separately from the real stylesheet
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}
const page = (inner: string) => `<a href="#main">Skip to main content</a>${renderToStaticMarkup(<SiteHeader products={[{ slug: 'finora', name: 'Finora', tagline: 'Your Personal Finance Management Platform', status: 'live' }]} />)}<main id="main">${inner}</main>${renderToStaticMarkup(<SiteFooter year={2026} />)}`;
const leader = { key: 'ceo', title: 'Founder and CEO', full_name: 'Test Person', headline: 'Headline', bio: null };

describe('accessibility of rendered pages (axe)', () => {
  it('homepage with no content published', async () => { expect(await audit(page(renderToStaticMarkup(<HomeView products={[]} posts={[]} news={[]} leaders={[]} />)))).toEqual([]); });
  it('homepage with every section populated', async () => {
    const html = renderToStaticMarkup(<HomeView products={[{ slug: 'finora', name: 'Finora', tagline: 'Tagline', category: 'Finance', status: 'live' }]} posts={[{ slug: 'a', title: 'Research title', summary: 's', category: 'research' }]} news={[{ type: 'announcement', slug: 'n', title: 'News title', summary: 's', published_at: '2026-01-01T00:00:00Z' }]} leaders={[leader]} />);
    expect(await audit(page(html))).toEqual([]);
  });
  it('help center FAQ', async () => { expect(await audit(page(`<h1>Help</h1>${SUPPORT_FAQ.map((g) => `<h2>${g.title}</h2>${renderToStaticMarkup(<Faq items={g.items} />)}`).join('')}`))).toEqual([]); });
  it('contact form has labelled fields', async () => {
    const form = renderToStaticMarkup(<PublicForm action={async () => ({})} submit="Send"><label className="field">Name<input name="name" className="input" /></label><label className="field">Email<input name="email" type="email" className="input" /></label></PublicForm>);
    expect(await audit(page(`<h1>Contact</h1>${form}`))).toEqual([]);
  });
});
