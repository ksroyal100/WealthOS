import { buildReport, emailReport } from '@/lib/cc/reports';
import { reportToText, type ReportKind } from '@/lib/cc/report-core';
import { admin } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cc/cron-auth';

// Daily at 06:00 UTC via GitHub Actions / Vercel Cron. Weekly on Mondays, monthly on the 1st.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const now = new Date();
  const kinds: ReportKind[] = ['daily'];
  if (now.getUTCDay() === 1) kinds.push('weekly');
  if (now.getUTCDate() === 1) kinds.push('monthly');
  if (now.getUTCDate() === 1 && now.getUTCMonth() === 0) kinds.push('annual');

  const out: Record<string, unknown> = {};
  for (const k of kinds) {
    const { data: sched } = await admin().from('report_schedules').select('enabled').eq('kind', k).single();
    if (!sched?.enabled) { out[k] = 'schedule disabled'; continue; }
    const r = await buildReport(k, now, null);
    out[k] = { id: r.id, email: await emailReport(k, r.id, reportToText(k, r.payload)) };
  }
  return Response.json(out);
}
