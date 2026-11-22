import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, F, inp, SubNav, fmtDateTime } from '@/components/cc/kit';
import { saveTechDoc } from '@/lib/cc/actions-eng';
import { paragraphs } from '@/lib/cms-routes';

export const metadata = { title: 'Technical documentation' };
const NAV: [string, string][] = [['Releases and deployments', '/command-center/engineering'], ['Incidents', '/command-center/engineering/incidents'], ['Technical docs', '/command-center/engineering/docs']];

export default async function Docs() {
  const staff = await requirePermission('engineering', 'view'); const db = admin();
  const [{ data: docs }, { data: products }, cc, ce] = await Promise.all([db.from('tech_docs').select('*').order('updated_at', { ascending: false }), db.from('products').select('id,name'), can(staff, 'engineering', 'create'), can(staff, 'engineering', 'edit')]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Technical documentation" desc="Runbooks, architecture notes and how-tos. Plain text; each save increases the version number." />
      <SubNav current="/command-center/engineering/docs" items={NAV} />
      {(docs ?? []).length === 0 && <p className="mb-4 text-sm text-slate-600">No documents yet.</p>}
      {(docs ?? []).map((d: any) => (<Section key={d.id} title={`${d.title} (v${d.version}, ${fmtDateTime(d.updated_at)})`}>
        <details><summary className="cursor-pointer text-sm underline">Read{ce ? ' or edit' : ''}</summary><div className="mt-3">{paragraphs(d.body).map((t, i) => <p key={i} className="mb-2 text-sm leading-6">{t}</p>)}
          {ce && <ActionForm action={saveTechDoc} submit="Save new version" resetOnSuccess={false} className="mt-3 grid gap-2"><input type="hidden" name="id" value={d.id} /><F label="Title"><input name="title" defaultValue={d.title} className={inp} /></F><F label="Body"><textarea name="body" rows={8} defaultValue={d.body ?? ''} className={inp} /></F></ActionForm>}</div></details></Section>))}
      {cc && <Section title="New document"><ActionForm action={saveTechDoc} submit="Create" className="grid gap-3"><F label="Title"><input required name="title" className={inp} /></F><F label="Product"><select name="product_id" className={inp}><option value="">General</option>{(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F><F label="Body"><textarea name="body" rows={6} className={inp} /></F></ActionForm></Section>}
    </div>
  );
}
