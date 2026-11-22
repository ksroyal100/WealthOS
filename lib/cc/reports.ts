import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { summarizeLedger, periodFor, type ReportKind, type LedgerRow } from '@/lib/cc/report-core';

/** Builds a report ONLY from verified tables. Missing data is reported as unavailable, never zero. */
export async function buildReport(kind: ReportKind, anchor: Date, actor: string | null) {
  const { start, end } = periodFor(kind, anchor);
  const db = admin();
  const today = new Date().toISOString().slice(0, 10);

  const [ledger, metrics, media, tasksDone, overdue, approvals, alerts, sources] = await Promise.all([
    db.from('ledger_entries').select('kind,status,amount,currency,product_id').gte('occurred_on', start).lte('occurred_on', end),
    db.from('product_metrics_daily').select('*').gte('day', start).lte('day', end),
    db.from('media_metrics_daily').select('*').gte('day', start).lte('day', end),
    db.from('tasks').select('id', { count: 'exact', head: true }).gte('completed_at', `${start}T00:00:00Z`).lte('completed_at', `${end}T23:59:59Z`),
    db.from('tasks').select('id', { count: 'exact', head: true }).lt('due_on', today).neq('status', 'done'),
    db.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('alerts').select('severity,kind,message,created_at').is('resolved_at', null).order('created_at', { ascending: false }).limit(20),
    db.from('data_sources').select('kind,status,last_synced_at,products(name)'),
  ]);

  const rows = (ledger.data ?? []) as LedgerRow[];
  const m = metrics.data ?? [];
  const payload = {
    period: { start, end },
    finance: rows.length ? summarizeLedger(rows) : { available: false },
    products: m.length
      ? {
          available: true,
          new_registrations: m.reduce((s, r: any) => s + (r.new_registrations ?? 0), 0),
          cancellations: m.reduce((s, r: any) => s + (r.cancellations ?? 0), 0),
          latest_day: m.map((r: any) => r.day).sort().at(-1),
          rows: m,
        }
      : { available: false, note: 'No product metrics received for this period' },
    media: (media.data ?? []).length ? { available: true, rows: media.data } : { available: false, note: 'No media analytics connected' },
    operations: { tasks_completed: tasksDone.count ?? 0, tasks_overdue: overdue.count ?? 0, approvals_pending: approvals.count ?? 0 },
    alerts: alerts.data ?? [],
  };
  const srcMeta = {
    generated_at: new Date().toISOString(),
    tables: ['ledger_entries', 'product_metrics_daily', 'media_metrics_daily', 'tasks', 'approvals', 'alerts'],
    data_sources: sources.data ?? [],
  };

  const { data, error } = await db.from('reports')
    .upsert({ kind, period_start: start, period_end: end, payload, sources: srcMeta, generated_by: actor }, { onConflict: 'kind,period_start' })
    .select('id').single();
  if (error) throw new Error('report save failed');
  await db.from('audit_log').insert({ actor_id: actor, action: 'generate', resource: 'report', record_id: data.id, outcome: 'success', meta: { kind, start, end } });
  return { id: data.id as string, kind, start, end, payload };
}

export async function emailReport(kind: ReportKind, reportId: string, text: string) {
  const db = admin();
  const { data: sched } = await db.from('report_schedules').select('enabled,recipients').eq('kind', kind).single();
  if (!sched?.enabled || !sched.recipients?.length) return { sent: false, reason: 'schedule disabled or no recipients' };
  if (!process.env.RESEND_API_KEY || !process.env.REPORT_FROM_EMAIL) return { sent: false, reason: 'email provider not configured' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.REPORT_FROM_EMAIL, to: sched.recipients, subject: `WealthOS ${kind} report`, text }),
  });
  await db.from('audit_log').insert({ action: 'email', resource: 'report', record_id: reportId, outcome: res.ok ? 'success' : 'error', meta: { kind } });
  return { sent: res.ok };
}
