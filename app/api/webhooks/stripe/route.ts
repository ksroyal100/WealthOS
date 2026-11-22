import { verifyStripeSignature } from '@/lib/billing/stripe';
import { processStripeEvent } from '@/lib/billing/webhook';
import { admin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'not configured' }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 1_000_000) return Response.json({ error: 'too large' }, { status: 413 });
  if (!verifyStripeSignature(secret, req.headers.get('stripe-signature') ?? '', raw)) return Response.json({ error: 'invalid signature' }, { status: 400 });

  let ev: any;
  try { ev = JSON.parse(raw); } catch { return Response.json({ error: 'invalid json' }, { status: 400 }); }
  if (typeof ev?.id !== 'string' || typeof ev?.type !== 'string') return Response.json({ error: 'invalid event' }, { status: 400 });

  const db = admin();
  const { error: claim } = await db.from('stripe_events').insert({ id: ev.id, type: ev.type });
  if (claim) return Response.json({ ok: true, duplicate: true });           // already processed

  try { await processStripeEvent(ev); }
  catch { await db.from('stripe_events').delete().eq('id', ev.id); return Response.json({ error: 'processing failed' }, { status: 500 }); }   // Stripe will retry
  return Response.json({ ok: true });
}
