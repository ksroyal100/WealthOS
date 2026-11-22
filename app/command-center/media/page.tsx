import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls, Unavailable } from '@/components/ui';
import { addContentItem, setContentStatus } from '@/lib/cc/actions';

export const dynamic = 'force-dynamic';
const STATUSES = ['idea', 'in_production', 'review', 'scheduled', 'published'];

export default async function Media() {
  const staff = await requirePermission('media', 'view');
  const db = admin();
  const [{ data: items }, { data: m }] = await Promise.all([db.from('content_items').select('*').order('due_on', { ascending: true, nullsFirst: false }).limit(200), db.from('media_metrics_daily').select('*').order('day', { ascending: false }).limit(1)]);
  const canCreate = await can(staff, 'media', 'create'); const canEdit = await can(staff, 'media', 'edit');
  const last: any = m?.[0];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Media operations</h1>
      <Card title="Channel analytics">{last ? <p className="text-sm">As of {last.day}: {last.views} views, {last.watch_time_minutes} minutes watched, {last.subscribers} subscribers ({last.source}).</p> : <Unavailable what="YouTube analytics" />}</Card>
      <Card title="Content calendar">
        {(items ?? []).length === 0 ? <p className="text-sm text-[#4A5A6A]">No content yet. Add the first item below.</p> : (
          <ul className="divide-y">{(items ?? []).map((i: any) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span><b>{i.title}</b> ({i.type}) due {i.due_on ?? 'unscheduled'}</span>
              {canEdit ? <form action={setContentStatus} className="flex gap-2"><input type="hidden" name="id" value={i.id} /><select name="status" defaultValue={i.status} className={inputCls}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><button className="text-xs underline">Update</button></form> : <span>{i.status}</span>}</li>))}</ul>)}
      </Card>
      {canCreate && <Card title="Add content"><form action={addContentItem} className="grid gap-3 md:grid-cols-4">
        <Field label="Title"><input required name="title" className={inputCls} /></Field>
        <Field label="Type"><select name="type" className={inputCls}>{['video', 'blog', 'documentary', 'research', 'news'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Due date"><input type="date" name="due_on" className={inputCls} /></Field><button className={btnCls}>Add content</button></form></Card>}
    </div>
  );
}
