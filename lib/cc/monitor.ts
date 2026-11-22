import 'server-only';
import { admin } from '@/lib/supabase/admin';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 86400_000;

/** Evaluates operational rules and opens/updates/resolves alerts. Safe to run repeatedly (one open alert per kind+source). */
export async function runMonitor(now = new Date()) {
  const db = admin(); const today = iso(now); const summary: Record<string, number> = {};

  async function sync(kind: string, source: string, active: boolean, severity: 'info' | 'warning' | 'critical', message: string) {
    const { data: open } = await db.from('alerts').select('id').eq('kind', kind).eq('source', source).is('resolved_at', null).maybeSingle();
    if (active) {
      if (open) await db.from('alerts').update({ message }).eq('id', open.id);
      else { const { error } = await db.from('alerts').insert({ kind, source, severity, message }); if (error && error.code !== '23505') throw error; }
    } else if (open) await db.from('alerts').update({ resolved_at: now.toISOString() }).eq('id', open.id);
  }

  // 1. Stale data sources (no report for 48h)
  const { data: sources } = await db.from('data_sources').select('id,kind,status,last_synced_at,products(name)');
  for (const s of (sources ?? []) as any[]) {
    if (s.status === 'disconnected') continue;
    const stale = !s.last_synced_at || now.getTime() - new Date(s.last_synced_at).getTime() > 2 * DAY;
    if (stale && s.status === 'connected') await db.from('data_sources').update({ status: 'stale' }).eq('id', s.id);
    await sync('data_stale', s.id, stale, 'warning', `${s.products?.name ?? s.kind} has not reported data for over 48 hours`);
  }

  // 2. Overdue work, 3. overdue projects, 4. approvals waiting > 3 days
  const od = await db.from('tasks').select('id', { count: 'exact', head: true }).lt('due_on', today).neq('status', 'done');
  summary.overdue_tasks = od.count ?? 0;
  await sync('overdue_work', 'tasks', (od.count ?? 0) > 0, 'warning', `${od.count ?? 0} task(s) are overdue`);
  const op = await db.from('projects').select('id', { count: 'exact', head: true }).lt('due_on', today).neq('status', 'done');
  summary.overdue_projects = op.count ?? 0;
  await sync('overdue_projects', 'projects', (op.count ?? 0) > 0, 'warning', `${op.count ?? 0} project(s) are past their deadline`);
  const pa = await db.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending').lt('created_at', new Date(now.getTime() - 3 * DAY).toISOString());
  summary.stale_approvals = pa.count ?? 0;
  await sync('approvals_waiting', 'approvals', (pa.count ?? 0) > 0, 'info', `${pa.count ?? 0} approval(s) have waited more than 3 days`);

  // 5. Significant revenue change: received revenue, last 7 days vs the 7 before (per currency)
  const since = iso(new Date(now.getTime() - 14 * DAY)); const split = new Date(now.getTime() - 7 * DAY);
  const { data: rev } = await db.from('ledger_entries').select('amount,currency,occurred_on').eq('kind', 'revenue').eq('status', 'received').gte('occurred_on', since);
  const byCur: Record<string, { last: number; prev: number }> = {};
  for (const r of (rev ?? []) as any[]) { const c = (byCur[r.currency] ??= { last: 0, prev: 0 }); (new Date(r.occurred_on) >= split ? (c.last += Number(r.amount)) : (c.prev += Number(r.amount))); }
  for (const [cur, v] of Object.entries(byCur)) await sync('performance_drop', `finance:${cur}`, v.prev >= 100 && v.last < v.prev * 0.7, 'warning', `Received revenue (${cur}) fell more than 30% versus the previous week`);

  // 6. Unusual amounts: a recent entry far above the 90-day average of the same type
  const { data: recent } = await db.from('ledger_entries').select('id,kind,amount,currency').gte('created_at', new Date(now.getTime() - DAY).toISOString());
  for (const e of (recent ?? []) as any[]) {
    const { data: hist } = await db.from('ledger_entries').select('amount').eq('kind', e.kind).eq('currency', e.currency).neq('id', e.id).gte('occurred_on', iso(new Date(now.getTime() - 90 * DAY)));
    if ((hist ?? []).length >= 5) {
      const avg = (hist as any[]).reduce((a, h) => a + Number(h.amount), 0) / hist!.length;
      if (Number(e.amount) >= 100 && Number(e.amount) > avg * 5) {
        const { error } = await db.from('alerts').insert({ kind: 'unusual_amount', severity: 'warning', message: `A ${e.kind} entry is more than 5x the recent average`, source: e.id });
        if (error && error.code !== '23505') throw error;
      }
    }
  }

  // 7. Documents expiring within 30 days (or already expired): one alert per document, closed when no longer relevant
  const in30 = iso(new Date(now.getTime() + 30 * DAY));
  const { data: docs } = await db.from('documents').select('id,title,expires_on').eq('status', 'active').not('expires_on', 'is', null).lte('expires_on', in30);
  const expiring = new Set((docs ?? []).map((d: any) => d.id as string)); summary.documents_expiring = expiring.size;
  for (const d of (docs ?? []) as any[]) await sync('document_expiring', d.id, true, d.expires_on < today ? 'critical' : 'warning', `"${d.title}" ${d.expires_on < today ? 'has expired' : 'expires on ' + d.expires_on}`);
  const { data: openDocAlerts } = await db.from('alerts').select('id,source').eq('kind', 'document_expiring').is('resolved_at', null);
  for (const a of (openDocAlerts ?? []) as any[]) if (!expiring.has(a.source)) await db.from('alerts').update({ resolved_at: now.toISOString() }).eq('id', a.id);

  // 8. Deadline reminders: tasks due within 2 days notify their assignee once
  const in2 = iso(new Date(now.getTime() + 2 * DAY));
  const { data: soon } = await db.from('tasks').select('title,due_on,assignee_id').neq('status', 'done').gte('due_on', today).lte('due_on', in2).not('assignee_id', 'is', null);
  let reminded = 0;
  for (const t of (soon ?? []) as any[]) {
    const body = `"${t.title}" is due ${t.due_on}`;
    const { data: ex } = await db.from('notifications').select('id').eq('user_id', t.assignee_id).eq('title', 'Deadline reminder').eq('body', body).maybeSingle();
    if (!ex) { await db.from('notifications').insert({ user_id: t.assignee_id, title: 'Deadline reminder', body }); reminded++; }
  }
  summary.reminders_sent = reminded;
  return summary;
}
