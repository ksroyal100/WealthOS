import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { Card, Field, inputCls, btnCls } from '@/components/ui';
import { savePublication, setPublicationPublished, deletePublication } from '@/lib/cc/actions';

export const dynamic = 'force-dynamic';
const CATS = ['documentary', 'financial_education', 'insights', 'news', 'research', 'blog', 'video'];

function PubFields({ p }: { p?: any }) {
  return (<>
    <Field label="Title"><input required name="title" defaultValue={p?.title} className={inputCls} /></Field>
    <Field label="URL slug"><input required name="slug" defaultValue={p?.slug} readOnly={!!p} pattern="[a-z0-9-]{3,80}" className={inputCls} /></Field>
    <Field label="Category"><select name="category" defaultValue={p?.category ?? 'blog'} className={inputCls}>{CATS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></Field>
    <Field label="Author"><input name="author" defaultValue={p?.author ?? ''} className={inputCls} /></Field>
    <div className="md:col-span-2"><Field label="Summary (shown in lists)"><input name="summary" maxLength={300} defaultValue={p?.summary ?? ''} className={inputCls} /></Field></div>
    <div className="md:col-span-2"><Field label="Body (plain text; blank line starts a new paragraph)"><textarea name="body" rows={8} defaultValue={p?.body ?? ''} className={inputCls} /></Field></div>
  </>);
}

export default async function Publications() {
  const staff = await requirePermission('media', 'view');
  const { data } = await admin().schema('public').from('publications').select('*').order('updated_at', { ascending: false }).limit(100);
  const [cc, ce, ca, cd] = await Promise.all([can(staff, 'media', 'create'), can(staff, 'media', 'edit'), can(staff, 'media', 'approve'), can(staff, 'media', 'delete')]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Publications</h1>
      <p className="max-w-prose text-sm text-[#4A5A6A]">Drafts stay private. Publishing to the public website requires approval permission.</p>
      {(data ?? []).map((p: any) => (
        <Card key={p.slug} title={`${p.title}  (${p.published ? 'published' : 'draft'})`}>
          <details><summary className="cursor-pointer text-sm underline">Edit</summary>
            {ce && <form action={savePublication} className="mt-3 grid gap-3 md:grid-cols-2"><PubFields p={p} /><button className={btnCls}>Save changes</button></form>}
          </details>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {ca && <form action={setPublicationPublished} className="flex items-center gap-2 text-sm"><input type="hidden" name="slug" value={p.slug} /><label><input type="checkbox" name="published" defaultChecked={p.published} /> Published</label><button className="text-xs underline">Apply</button></form>}
            {cd && <form action={deletePublication}><input type="hidden" name="slug" value={p.slug} /><button className="text-xs text-red-700 underline">Delete</button></form>}
          </div>
        </Card>))}
      {cc && <Card title="New publication"><form action={savePublication} className="grid gap-3 md:grid-cols-2"><PubFields /><button className={btnCls}>Save draft</button></form></Card>}
    </div>
  );
}
