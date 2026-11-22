import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, inputCls, btnCls } from '@/components/ui';
import { saveSchedule } from '@/lib/cc/actions';
import { reportToText } from '@/lib/cc/report-core';
import GenerateButtons from './generate-buttons';

export const dynamic = 'force-dynamic';

export default async function Reports() {
  const staff = await requirePermission('reports', 'view');
  const db = admin();
  const [{ data: reports }, { data: sched }, canEdit, canCreate] = await Promise.all([
    db.from('reports').select('id,kind,period_start,period_end,generated_at,payload,sources').order('generated_at', { ascending: false }).limit(10),
    db.from('report_schedules').select('*'), can(staff, 'reports', 'edit'), can(staff, 'reports', 'create')]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      {canCreate && <GenerateButtons />}
      {(reports ?? []).length === 0 && <p className="text-sm text-[#4A5A6A]">No reports generated yet.</p>}
      {(reports ?? []).map((r: any) => (
        <Card key={r.id} title={`${r.kind} report, ${r.period_start} to ${r.period_end} (generated ${new Date(r.generated_at).toUTCString()})`}>
          <pre className="whitespace-pre-wrap text-sm">{reportToText(r.kind, r.payload)}</pre>
          <p className="mt-2 text-xs text-[#4A5A6A]">Sources: {r.sources?.tables?.join(', ')}</p></Card>))}
      {canEdit && <Card title="Email schedules">{(sched ?? []).map((s: any) => (
        <form key={s.kind} action={saveSchedule} className="mb-3 flex flex-wrap items-center gap-2 text-sm"><input type="hidden" name="kind" value={s.kind} /><b className="w-20">{s.kind}</b>
          <label><input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Enabled</label><input name="recipients" defaultValue={s.recipients.join(', ')} placeholder="a@x.com, b@x.com" className={inputCls + ' max-w-md'} /><button className={btnCls}>Save</button></form>))}</Card>}
    </div>
  );
}
