import { requireStaff } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { markAllRead } from '@/lib/cc/actions';
import { btnCls } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Inbox() {
  const staff = await requireStaff();
  const { data } = await admin().from('notifications').select('id,title,body,read_at,created_at').eq('user_id', staff.userId).order('created_at', { ascending: false }).limit(50);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Inbox</h1><form action={markAllRead}><button className={btnCls}>Mark all read</button></form></div>
      {(data ?? []).length === 0 ? <p className="text-sm text-[#4A5A6A]">You are all caught up.</p> : (
        <ul className="divide-y rounded-lg border bg-white">{(data ?? []).map((n: any) => (
          <li key={n.id} className="p-4 text-sm"><div className={n.read_at ? '' : 'font-semibold'}>{n.title}</div><div className="text-[#4A5A6A]">{n.body}</div><div className="mt-1 text-xs text-[#4A5A6A]">{new Date(n.created_at).toUTCString()}</div></li>))}</ul>)}
    </div>
  );
}
