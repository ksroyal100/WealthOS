import { sessionClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { sameOrigin } from '@/lib/cc/csrf';
import { rateLimit } from '@/lib/rate-limit';
import { siteUrl } from '@/lib/env';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ error: 'Billing portal is not configured' }, { status: 503 });
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!rateLimit(`portal:${user.id}`, 10, 60_000)) return Response.json({ error: 'rate limited' }, { status: 429 });

  const { data: b } = await admin().schema('public').from('customer_billing').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!b) return Response.json({ error: 'No billing profile yet' }, { status: 404 });
  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer: b.stripe_customer_id, return_url: `${siteUrl()}/account` }),
  });
  if (!res.ok) return Response.json({ error: 'Could not open billing portal' }, { status: 502 });
  const j = await res.json();
  return Response.json({ url: j.url });
}
