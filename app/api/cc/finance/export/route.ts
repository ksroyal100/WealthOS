import { requirePermission } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';

const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;                 // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  try {
    const staff = await requirePermission('finance', 'export');
    const u = new URL(req.url);
    let q = admin().from('ledger_entries').select('occurred_on,kind,category,status,amount,currency,description,source,external_ref').order('occurred_on', { ascending: false }).limit(10000);
    for (const f of ['kind', 'status', 'category'] as const) { const v = u.searchParams.get(f); if (v) q = q.eq(f, v); }
    const from = u.searchParams.get('from'); const to = u.searchParams.get('to');
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) q = q.gte('occurred_on', from);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) q = q.lte('occurred_on', to);
    const { data } = await q;
    const cols = ['occurred_on', 'kind', 'category', 'status', 'amount', 'currency', 'description', 'source', 'external_ref'];
    const csv = [cols.join(','), ...(data ?? []).map((r: any) => cols.map((c) => cell(r[c])).join(','))].join('\n');
    await admin().from('audit_log').insert({ actor_id: staff.userId, action: 'export', resource: 'finance', outcome: 'success', meta: { rows: data?.length ?? 0 } });
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ledger.csv"', 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
