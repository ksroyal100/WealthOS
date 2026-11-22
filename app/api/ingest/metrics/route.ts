import { admin } from '@/lib/supabase/admin';
import { verifySignature } from '@/lib/cc/hmac';
import { metricsPayload } from '@/lib/cc/schemas';
import { rateLimit } from '@/lib/rate-limit';

// Products push aggregated metrics here. Headers: x-product, x-timestamp (ms), x-signature (hex HMAC-SHA256).
export async function POST(req: Request) {
  const slug = (req.headers.get('x-product') ?? '').toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return Response.json({ error: 'bad request' }, { status: 400 });
  if (!rateLimit(`ingest:${slug}`, 120, 60_000)) return Response.json({ error: 'rate limited' }, { status: 429 });

  const secret = process.env[`INGEST_SECRET_${slug.toUpperCase().replace(/-/g, '_')}`];
  const raw = await req.text();
  if (raw.length > 64_000) return Response.json({ error: 'too large' }, { status: 413 });
  if (!secret || !verifySignature(secret, req.headers.get('x-timestamp') ?? '', raw, req.headers.get('x-signature') ?? ''))
    return Response.json({ error: 'unauthorized' }, { status: 401 });

  let json: unknown;
  try { json = JSON.parse(raw); } catch { return Response.json({ error: 'invalid json' }, { status: 400 }); }
  const parsed = metricsPayload.safeParse(json);
  if (!parsed.success) return Response.json({ error: 'invalid payload' }, { status: 422 });

  const db = admin();
  const { data: product } = await db.from('products').select('id').eq('slug', slug).maybeSingle();
  if (!product) return Response.json({ error: 'unknown product' }, { status: 404 });

  const { error } = await db.from('product_metrics_daily').upsert({ product_id: product.id, ...parsed.data, received_at: new Date().toISOString() }, { onConflict: 'product_id,day' });
  if (error) return Response.json({ error: 'store failed' }, { status: 500 });

  await db.from('data_sources').upsert({ product_id: product.id, kind: `${slug}_metrics`, status: 'connected', last_synced_at: new Date().toISOString() }, { onConflict: 'product_id,kind' });
  if (parsed.data.health === 'down')
    await db.from('alerts').insert({ severity: 'critical', kind: 'product_downtime', message: `${slug} reported health: down`, source: slug });
  return Response.json({ ok: true });
}
