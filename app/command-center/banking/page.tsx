import { requirePermission } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Banking() {
  await requirePermission('banking', 'view');
  const { data } = await admin().from('bank_connections').select('id,provider,label,status,scope,last_synced_at');
  const live = (data ?? []).filter((c: any) => c.status === 'connected');
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Banking operations</h1>
      {live.length === 0 ? (
        <Card title="Status">
          <p className="font-medium">No banking integration is configured.</p>
          <p className="mt-2 max-w-prose text-sm text-[#4A5A6A]">Balances, incoming and outgoing payments and reconciliation appear here after an official bank API or authorized provider is connected with read-only access. WealthOS never stores online banking passwords, PINs or OTPs, and this module cannot move money.</p>
        </Card>) : (
        <Card title="Connections"><ul className="text-sm">{live.map((c: any) => <li key={c.id}>{c.label} ({c.provider}), {c.scope}, last sync {c.last_synced_at ?? 'never'}</li>)}</ul></Card>)}
    </div>
  );
}
