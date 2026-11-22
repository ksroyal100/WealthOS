import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, F, inp, fmtDateTime } from '@/components/cc/kit';
import { cmsSave, cmsTransition } from '@/lib/cc/actions-corporate';
import { publicPath, paragraphs } from '@/lib/cms-routes';

export const metadata = { title: 'Edit content' };

export default async function CmsEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requirePermission('cms', 'view');
  const db = admin();
  const { data: d } = await db.from('cms_documents').select('*').eq('id', id).maybeSingle();
  if (!d) notFound();
  const [{ data: revs }, canEdit, canApprove] = await Promise.all([db.from('cms_revisions').select('id,version,status,edited_by,at').eq('document_id', id).order('id', { ascending: false }).limit(50), can(staff, 'cms', 'edit'), can(staff, 'cms', 'approve')]);
  const editable = canEdit && (d.status === 'draft' || d.status === 'unpublished');
  const mine = d.created_by === staff.userId || d.submitted_by === staff.userId;
  const path = publicPath(d.type, d.slug);
  const hid = <input type="hidden" name="id" value={id} />;
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/command-center/cms" className="text-sm underline">All content</Link>
      <PageHeader title={d.title} desc={`${d.type.replace('_', ' ')} · version ${d.version} · ${path ? `will appear at ${path}` : 'not linked to a public page'}`} actions={<Pill tone={toneFor(d.status)}>{d.status.replace('_', ' ')}</Pill>} />

      <Section title="Workflow">
        <ol className="mb-4 flex flex-wrap gap-2 text-xs" aria-label="Stages">{['draft', 'in_review', 'approved', 'published'].map((s) => <li key={s} className={`rounded-full px-3 py-1 ${d.status === s ? 'bg-[#0E3B2E] text-white' : 'bg-slate-100'}`}>{s.replace('_', ' ')}</li>)}</ol>
        {d.status === 'draft' && canEdit && <ActionForm action={cmsTransition} submit="Submit for review" compact className="flex">{hid}<input type="hidden" name="to" value="in_review" /></ActionForm>}
        {d.status === 'in_review' && (canApprove ? (mine ? <p className="text-sm text-amber-800">You created or submitted this, so someone else must review it.</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <ActionForm action={cmsTransition} submit="Approve" compact className="flex items-end gap-3">{hid}<input type="hidden" name="to" value="approved" /></ActionForm>
            <ActionForm action={cmsTransition} submit="Reject with a reason" danger className="flex flex-wrap items-end gap-3">{hid}<input type="hidden" name="to" value="draft" /><F label="Reason (required)"><input required name="note" className={inp} /></F></ActionForm></div>)) : <p className="text-sm text-slate-600">Waiting for a reviewer with approval permission.</p>)}
        {d.status === 'approved' && canApprove && <ActionForm action={cmsTransition} submit="Publish" className="flex flex-wrap items-end gap-3">{hid}<input type="hidden" name="to" value="published" /><F label="Schedule for later (optional, your local time)"><input type="datetime-local" name="schedule" className={inp} /></F></ActionForm>}
        {d.status === 'published' && <p className="mb-2 text-sm">Published {fmtDateTime(d.published_at)}{new Date(d.published_at) > new Date() ? ' (scheduled, not live yet)' : ''}.</p>}
        {d.status === 'published' && canApprove && <ActionForm action={cmsTransition} submit="Unpublish" danger compact className="flex">{hid}<input type="hidden" name="to" value="unpublished" /></ActionForm>}
        {d.status === 'unpublished' && canEdit && <ActionForm action={cmsTransition} submit="Return to draft" compact className="flex">{hid}<input type="hidden" name="to" value="draft" /></ActionForm>}
      </Section>

      <Section title={editable ? 'Edit' : 'Content (locked)'}>
        {!editable && <p className="mb-3 text-sm text-slate-600">Content is locked while it is under review, approved or live. Reject or unpublish it to edit.</p>}
        <ActionForm action={cmsSave} submit="Save changes" resetOnSuccess={false} className={editable ? 'grid gap-3' : 'hidden'}>
          {hid}<F label="Title"><input required name="title" defaultValue={d.title} className={inp} disabled={!editable} /></F>
          <F label="Summary"><input name="summary" defaultValue={d.summary ?? ''} maxLength={400} className={inp} disabled={!editable} /></F>
          <F label="Topic"><input name="topic" defaultValue={d.topic ?? ''} className={inp} disabled={!editable} /></F>
          <F label="Body"><textarea name="body" rows={12} defaultValue={d.body ?? ''} className={inp} disabled={!editable} /></F>
        </ActionForm>
      </Section>

      <Section title="Preview (not public)">
        <article className="rounded border border-dashed p-5"><h3 className="text-xl font-semibold">{d.title}</h3>{d.summary && <p className="mt-1 text-slate-600">{d.summary}</p>}{paragraphs(d.body).map((t, i) => <p key={i} className="mt-3 leading-7">{t}</p>)}{!d.body && <p className="text-sm text-slate-500">No body yet.</p>}</article>
      </Section>

      <Section title="Revision history">
        <ul className="divide-y text-sm">{(revs ?? []).map((r: any) => <li key={r.id} className="flex justify-between py-1.5"><span>v{r.version}, {r.status.replace('_', ' ')}</span><span className="text-slate-600">{fmtDateTime(r.at)}</span></li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">Revisions cannot be changed or deleted.</p>
      </Section>
    </div>
  );
}
