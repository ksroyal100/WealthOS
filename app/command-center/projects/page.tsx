import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls } from '@/components/ui';
import { createProject, createTask, setTaskStatus } from '@/lib/cc/actions';

export const dynamic = 'force-dynamic';

export default async function Projects() {
  const staff = await requirePermission('projects', 'view');
  const db = admin();
  // Row scoping: CEO sees all; everyone else sees only projects they own or are assigned to.
  let pq = db.from('projects').select('*').order('created_at', { ascending: false });
  if (!staff.roles.includes('ceo')) {
    const { data: mine } = await db.from('project_members').select('project_id').eq('user_id', staff.userId);
    const ids = (mine ?? []).map((m: any) => m.project_id);
    pq = pq.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  }
  const { data: projects } = await pq;
  const ids = (projects ?? []).map((p: any) => p.id);
  const { data: tasks } = ids.length ? await db.from('tasks').select('*').in('project_id', ids).order('due_on', { ascending: true, nullsFirst: false }) : { data: [] as any[] };
  const [cp, ct, et] = await Promise.all([can(staff, 'projects', 'create'), can(staff, 'tasks', 'create'), can(staff, 'tasks', 'edit')]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Projects and tasks</h1>
      {(projects ?? []).length === 0 && <p className="text-sm text-[#4A5A6A]">No projects assigned to you yet.</p>}
      {(projects ?? []).map((p: any) => {
        const t = (tasks ?? []).filter((x: any) => x.project_id === p.id);
        const done = t.filter((x: any) => x.status === 'done').length;
        return (
          <Card key={p.id} title={`${p.name} (${p.status}) ${t.length ? Math.round((done / t.length) * 100) : 0}% complete`}>
            <ul className="divide-y text-sm">{t.map((x: any) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{x.title} <i className="text-[#4A5A6A]">{x.priority}, due {x.due_on ?? 'n/a'}</i>{x.due_on && x.due_on < today && x.status !== 'done' && <b className="ml-2 text-red-700">Overdue</b>}{x.status === 'blocked' && <b className="ml-2 text-[#9A6410]">Blocked: {x.blocked_reason}</b>}</span>
                {et && <form action={setTaskStatus} className="flex gap-2"><input type="hidden" name="id" value={x.id} />
                  <select name="status" defaultValue={x.status} className={inputCls}>{['todo', 'in_progress', 'blocked', 'done'].map((s) => <option key={s}>{s}</option>)}</select>
                  <input name="blocked_reason" placeholder="Reason if blocked" className={inputCls} /><button className="text-xs underline">Update</button></form>}
              </li>))}</ul>
            {ct && <form action={createTask} className="mt-3 grid gap-2 md:grid-cols-4"><input type="hidden" name="project_id" value={p.id} />
              <input required name="title" placeholder="New task" className={inputCls} />
              <select name="priority" className={inputCls}>{['low', 'medium', 'high', 'urgent'].map((s) => <option key={s}>{s}</option>)}</select>
              <input type="date" name="due_on" className={inputCls} /><button className={btnCls}>Add task</button></form>}
          </Card>);
      })}
      {cp && <Card title="New project"><form action={createProject} className="grid gap-3 md:grid-cols-4">
        <Field label="Name"><input required name="name" className={inputCls} /></Field><Field label="Deadline"><input type="date" name="due_on" className={inputCls} /></Field>
        <Field label="Description"><input name="description" className={inputCls} /></Field><button className={btnCls}>Create project</button></form></Card>}
    </div>
  );
}
