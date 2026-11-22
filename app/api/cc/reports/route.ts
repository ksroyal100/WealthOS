import { z } from 'zod';
import { requirePermission } from '@/lib/cc/authz';
import { buildReport } from '@/lib/cc/reports';
import { reportToText } from '@/lib/cc/report-core';
import { rateLimit } from '@/lib/rate-limit';
import { sameOrigin } from '@/lib/cc/csrf';

const body = z.object({ kind: z.enum(['daily', 'weekly', 'monthly', 'annual']), format: z.enum(['json', 'text']).default('json') });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const staff = await requirePermission('reports', 'create');
    if (!rateLimit(`report:${staff.userId}`, 10, 60_000)) return Response.json({ error: 'rate limited' }, { status: 429 });
    const p = body.safeParse(await req.json().catch(() => null));
    if (!p.success) return Response.json({ error: 'invalid input' }, { status: 422 });
    const r = await buildReport(p.data.kind, new Date(), staff.userId);
    if (p.data.format === 'text') return new Response(reportToText(r.kind, r.payload), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="wealthos-${r.kind}-${r.start}.txt"` } });
    return Response.json(r);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
