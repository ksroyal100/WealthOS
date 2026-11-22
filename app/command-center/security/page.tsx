import { requirePermission } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { signOutEverywhere } from '@/lib/auth/actions';

export const dynamic = 'force-dynamic';

export default async function Security() {
  await requirePermission('audit', 'view');
  const { data } = await admin().from('audit_log').select('id,at,actor_id,action,resource,record_id,outcome').order('id', { ascending: false }).limit(200);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <form action={signOutEverywhere}><button className="rounded border px-4 py-2 text-sm">Sign out of all my devices</button></form>
      <p className="text-sm text-[#4A5A6A]">Append-only. Shows who did what, when, to which record, and the outcome.</p>
      <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F3F5F7]"><tr><th className="p-2">When (UTC)</th><th>Actor</th><th>Action</th><th>Resource</th><th>Record</th><th>Outcome</th></tr></thead>
        <tbody>{(data ?? []).map((r: any) => <tr key={r.id} className="border-t"><td className="p-2">{new Date(r.at).toISOString()}</td><td>{r.actor_id ?? 'system'}</td><td>{r.action}</td><td>{r.resource}</td><td>{r.record_id ?? ''}</td><td>{r.outcome}</td></tr>)}</tbody></table></div>
    </div>
  );
}
