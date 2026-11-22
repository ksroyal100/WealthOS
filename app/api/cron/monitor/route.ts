import { cronAuthorized } from '@/lib/cc/cron-auth';
import { runMonitor } from '@/lib/cc/monitor';

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try { return Response.json(await runMonitor()); } catch { return Response.json({ error: 'monitor failed' }, { status: 500 }); }
}
