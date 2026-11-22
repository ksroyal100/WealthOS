import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls } from '@/components/ui';
import { registerProduct, setCatalogListing } from '@/lib/cc/actions';

export const dynamic = 'force-dynamic';

export default async function Products() {
  const staff = await requirePermission('products', 'view');
  const db = admin();
  const [{ data: products }, { data: sources }] = await Promise.all([db.from('products').select('*').order('created_at'), db.from('data_sources').select('product_id,status,last_synced_at')]);
  const canCreate = await can(staff, 'products', 'create');
  const canEdit = await can(staff, 'products', 'edit');
  const { data: listings } = await db.schema('public').from('catalog_products').select('slug,status,published');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Product management</h1>
      <div className="overflow-x-auto rounded-lg border border-[#DDE3E9] bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-[#F3F5F7]"><tr><th className="p-2">Product</th><th>Category</th><th>Status</th><th>Integration</th><th>Last sync</th><th>Public listing</th></tr></thead>
        <tbody>{(products ?? []).map((p: any) => { const s = (sources ?? []).find((x: any) => x.product_id === p.id); return (
          <tr key={p.id} className="border-t"><td className="p-2"><a href={`/command-center/products/${p.slug}`} className="font-bold underline">{p.name}</a><div className="text-xs text-[#4A5A6A]">{p.description}</div></td><td>{p.category ?? 'n/a'}</td><td>{p.status}</td><td>{s?.status ?? 'disconnected'}</td><td>{s?.last_synced_at ?? 'never'}</td>
          <td>{(() => { const l: any = (listings ?? []).find((x: any) => x.slug === p.slug); if (!l) return 'No listing'; return canEdit ? (
            <form action={setCatalogListing} className="flex items-center gap-2"><input type="hidden" name="slug" value={p.slug} />
              <select name="status" defaultValue={l.status} className={inputCls}><option value="live">Live</option><option value="beta">Beta</option><option value="coming_soon">Coming soon</option></select>
              <label className="text-xs"><input type="checkbox" name="published" defaultChecked={l.published} /> Published</label><button className="text-xs underline">Save</button></form>) : (l.published ? 'Published' : 'Hidden'); })()}</td></tr>); })}</tbody></table></div>
      {canCreate && (
        <Card title="Register a product">
          <p className="mb-3 text-sm text-[#4A5A6A]">After registering, set INGEST_SECRET_{'{SLUG}'} on this app and have the product post signed daily metrics to /api/ingest/metrics. The Command Center never connects to a product database.</p>
          <form action={registerProduct} className="grid gap-3 md:grid-cols-3">
            <Field label="Slug"><input required name="slug" pattern="[a-z0-9-]{2,40}" className={inputCls} /></Field>
            <Field label="Name"><input required name="name" className={inputCls} /></Field>
            <Field label="Category"><input name="category" className={inputCls} /></Field>
            <Field label="Website URL"><input type="url" name="website_url" className={inputCls} /></Field>
            <Field label="Application URL"><input type="url" name="app_url" className={inputCls} /></Field>
            <Field label="Description"><input name="description" className={inputCls} /></Field>
            <button className={btnCls}>Register product</button>
          </form>
        </Card>)}
    </div>
  );
}
