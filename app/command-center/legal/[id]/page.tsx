import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, fmtDate, fmtDateTime } from '@/components/cc/kit';
import { uploadDocumentVersion, setDocumentStatus } from '@/lib/cc/actions-legal';
import { docResource } from '@/lib/cc/doc-policy';

export const metadata = { title: 'Document' };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = admin();
  const { data: d } = await db.from('documents').select('*').eq('id', id).maybeSingle();
  if (!d) notFound();
  const res = docResource(d.category, d.confidentiality);
  const staff = await requirePermission(res, 'view');               // confidential documents answer 403 to everyone without the special permission
  const [{ data: vers }, canEdit, canDownload] = await Promise.all([db.from('document_versions').select('version,filename,mime,size_bytes,sha256,uploaded_by,at').eq('document_id', id).order('version', { ascending: false }), can(staff, res, 'edit'), can(staff, res, 'export')]);
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/command-center/legal" className="text-sm underline">All documents</Link>
      <PageHeader title={d.title} desc={`${d.category} · ${d.confidentiality}${d.counterparty ? ` · ${d.counterparty}` : ''}${d.expires_on ? ` · expires ${fmtDate(d.expires_on)}` : ''}`} actions={<Pill tone={toneFor(d.status)}>{d.status}</Pill>} />
      <Section title="Versions">
        <Table caption="Versions" head={['Version', 'File', 'Size', 'Checksum (SHA-256)', 'Uploaded', '']} empty={(vers ?? []).length === 0}>
          {(vers ?? []).map((v: any) => (<tr key={v.version}><Td>v{v.version}</Td><Td>{v.filename}</Td><Td>{Math.ceil(v.size_bytes / 1024)} KB</Td><Td className="max-w-[10rem] truncate font-mono text-xs" title={v.sha256}>{v.sha256.slice(0, 16)}…</Td><Td>{fmtDateTime(v.at)}</Td><Td>{canDownload ? <a className="underline" href={`/api/cc/documents/${id}/download?v=${v.version}`}>Download</a> : <span className="text-xs text-slate-500">No download permission</span>}</Td></tr>))}
        </Table>
        <p className="mt-2 text-xs text-slate-500">Versions cannot be altered or deleted. Uploading a new file adds a new version.</p>
      </Section>
      {canEdit && <>
        <Section title="Upload a new version"><ActionForm action={uploadDocumentVersion} submit="Upload" className="grid gap-3"><input type="hidden" name="id" value={id} /><F label="File (PDF, Word, Excel, PNG, JPEG or text, up to 10 MB)"><input required type="file" name="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt" className={inp} /></F></ActionForm></Section>
        <Section title="Status and expiry"><ActionForm action={setDocumentStatus} submit="Save" resetOnSuccess={false}><input type="hidden" name="id" value={id} /><F label="Status"><select name="status" defaultValue={d.status} className={inp}>{['draft', 'active', 'expired', 'archived'].map((s) => <option key={s}>{s}</option>)}</select></F><F label="Expires on"><input type="date" name="expires_on" defaultValue={d.expires_on ?? ''} className={inp} /></F></ActionForm></Section></>}
    </div>
  );
}
