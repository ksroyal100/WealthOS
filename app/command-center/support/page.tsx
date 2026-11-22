import Link from 'next/link';
import { requirePermission } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { PageHeader, Pill, toneFor, Table, Td, FilterBar, fmtDateTime } from '@/components/cc/kit';

export const metadata = { title: 'Support requests' };
const ST = ['open', 'pending', 'closed'];

export default async function Support({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requirePermission('support', 'view'); const sp = await searchParams;
  let q = admin().schema('public').from('support_requests').select('id,subject,category,status,created_at,updated_at').order('updated_at', { ascending: false }).limit(200);
  if (sp.status && ST.includes(sp.status)) q = q.eq('status', sp.status);
  if (sp.q) q = q.ilike('subject', `%${sp.q.replace(/[%_]/g, '')}%`);
  const { data } = await q;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Support requests" desc="Requests from customers. Customers only ever see their own thread." />
      <FilterBar q={sp.q} status={sp.status} statuses={ST} />
      <Table caption="Support requests" head={['Subject', 'Category', 'Status', 'Last activity']} empty={(data ?? []).length === 0}>
        {(data ?? []).map((r: any) => (<tr key={r.id}><Td><Link className="font-medium underline" href={`/command-center/support/${r.id}`}>{r.subject}</Link></Td><Td>{r.category}</Td><Td><Pill tone={toneFor(r.status)}>{r.status}</Pill></Td><Td>{fmtDateTime(r.updated_at)}</Td></tr>))}
      </Table>
    </div>
  );
}
