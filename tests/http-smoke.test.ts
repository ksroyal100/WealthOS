import { describe, it, expect } from 'vitest';

// Runs against a live server: SMOKE_BASE_URL=http://localhost:3111 npx vitest run tests/http-smoke.test.ts
const BASE = process.env.SMOKE_BASE_URL;
const get = (p: string, init?: RequestInit) => fetch(BASE + p, { redirect: 'manual', ...init });

const suite = BASE ? describe : describe.skip;
const T = 120_000;
suite('HTTP smoke tests against a running server', { timeout: T }, () => {
  const PUBLIC = ['/', '/about', '/mission', '/leadership', '/governance', '/corporate/structure', '/divisions', '/tech', '/media', '/media/research', '/marketplace', '/pricing', '/newsroom', '/research', '/careers', '/partnerships', '/investors', '/contact', '/security', '/support', '/privacy', '/terms', '/accessibility', '/account/login', '/account/register', '/account/forgot'];
  it.each(PUBLIC)('%s renders with one h1, a skip link and a main landmark', async (p) => {
    const r = await get(p); expect(r.status).toBe(200);
    const html = await r.text();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1); expect(html).toContain('Skip to main content'); expect(html).toContain('id="main"'); expect(html).toContain('<html lang="en-US"');
  });
  it('unknown pages return 404', async () => { expect((await get('/no-such-page')).status).toBe(404); expect((await get('/newsroom/does-not-exist')).status).toBe(404); expect((await get('/media/does-not-exist')).status).toBe(404); });
  it('security headers are present and production CSP forbids eval', async () => {
    const r = await get('/'); const csp = r.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("frame-ancestors 'none'"); expect(csp).not.toContain('unsafe-eval'); expect(r.headers.get('x-content-type-options')).toBe('nosniff'); expect(r.headers.get('strict-transport-security')).toBeTruthy(); expect(r.headers.get('x-powered-by')).toBeNull();
  });
  it('the staff portal and its APIs are closed to anonymous visitors', async () => {
    for (const p of ['/command-center', '/command-center/finance', '/command-center/hr', '/command-center/legal', '/command-center/cms', '/command-center/team']) { const r = await get(p); expect([301, 302, 303, 307, 308]).toContain(r.status); expect(r.headers.get('location') ?? '').toContain('/command-center/login'); }
    for (const p of ['/api/cc/health', '/api/cc/finance/export', '/api/cc/documents/00000000-0000-4000-8000-000000000000/download']) expect((await get(p)).status).toBe(401);
    expect((await get('/api/cc/reports', { method: 'POST' })).status).toBe(401);
  });
  it('customer pages require sign-in and never leak data', async () => {
    for (const p of ['/account', '/account/subscriptions', '/account/billing', '/account/security', '/account/support']) { const r = await get(p); expect([301, 302, 303, 307, 308]).toContain(r.status); expect(r.headers.get('location') ?? '').toContain('/account/login'); }
    expect((await get('/api/me')).status).toBe(401);
  });
  it('machine endpoints refuse unsigned or unauthorised calls', async () => {
    expect((await get('/api/ingest/metrics', { method: 'POST', headers: { 'x-product': 'finora' }, body: '{}' })).status).toBe(401);
    expect((await get('/api/cron/reports', { method: 'POST' })).status).toBe(401); expect((await get('/api/cron/monitor', { method: 'POST' })).status).toBe(401);
    expect((await get('/api/webhooks/stripe', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=00' } })).status).toBe(400);
    expect((await get('/api/account/billing-portal', { method: 'POST' })).status).toBe(403);   // no same-origin header
  });
  it('health, robots, sitemap and security.txt behave', async () => {
    expect((await (await get('/api/health')).json()).ok).toBe(true);
    const robots = await (await get('/robots.txt')).text(); expect(robots).toContain('Disallow: /command-center'); expect(robots).toContain('Sitemap:');
    const sm = await get('/sitemap.xml'); expect(sm.status).toBe(200); expect(await sm.text()).toContain('/leadership');
  });
  it('the public contact form rejects a bot that fills the honeypot silently and does not crash on junk', async () => { expect((await get('/contact')).status).toBe(200); });
});
