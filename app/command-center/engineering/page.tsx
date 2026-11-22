import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, SubNav, fmtDate, fmtDateTime } from '@/components/cc/kit';
import { saveRelease, setReleaseStatus, logDeployment } from '@/lib/cc/actions-eng';

export const metadata = { title: 'Releases and deployments' };
export const ENG_NAV: [string, string][] = [['Releases and deployments', '/command-center/engineering'], ['Incidents', '/command-center/engineering/incidents'], ['Technical docs', '/command-center/engineering/docs']];

export default async function Engineering() {
  const staff = await requirePermission('engineering', 'view'); const db = admin();
  const [{ data: products }, { data: releases }, { data: deps }, cc, ca] = await Promise.all([db.from('products').select('id,name'), db.from('releases').select('*').order('created_at', { ascending: false }).limit(100), db.from('deployments').select('*').order('deployed_at', { ascending: false }).limit(50), can(staff, 'engineering', 'create'), can(staff, 'engineering', 'approve')]);
  const pn = (id: string) => (products ?? []).find((p: any) => p.id === id)?.name ?? '';
  const ProductSelect = () => <F label="Product"><select required name="product_id" className={inp}>{(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Releases and deployments" desc="What is planned, what shipped and what happened in production. Marking a release as shipped needs approval-level permission. A failed production deployment raises an alert automatically." />
      <SubNav current="/command-center/engineering" items={ENG_NAV} />
      <Section title="Releases"><Table caption="Releases" head={['Product', 'Version', 'Status', 'Planned', 'Released', 'Change status']} empty={(releases ?? []).length === 0}>
        {(releases ?? []).map((r: any) => (<tr key={r.id}><Td>{pn(r.product_id)}</Td><Td className="font-medium">{r.version}</Td><Td><Pill tone={toneFor(r.status)}>{r.status.replace('_', ' ')}</Pill></Td><Td>{fmtDate(r.planned_for)}</Td><Td>{fmtDateTime(r.released_at)}</Td>
          <Td><ActionForm action={setReleaseStatus} submit="Set" compact resetOnSuccess={false} className="flex gap-1"><input type="hidden" name="id" value={r.id} /><select name="status" defaultValue={r.status} aria-label="Release status" className="rounded border p-1 text-sm">{['planned', 'in_progress', 'released', 'rolled_back'].map((s) => <option key={s} value={s} disabled={s === 'released' && !ca}>{s.replace('_', ' ')}</option>)}</select></ActionForm></Td></tr>))}</Table></Section>
      <Section title="Recent deployments"><Table caption="Deployments" head={['When', 'Product', 'Environment', 'Result', 'Commit']} empty={(deps ?? []).length === 0}>
        {(deps ?? []).map((d: any) => (<tr key={d.id}><Td>{fmtDateTime(d.deployed_at)}</Td><Td>{pn(d.product_id)}</Td><Td>{d.environment}</Td><Td><Pill tone={toneFor(d.status)}>{d.status.replace('_', ' ')}</Pill></Td><Td className="font-mono text-xs">{d.commit_sha}</Td></tr>))}</Table></Section>
      {cc && <div className="grid gap-6 md:grid-cols-2">
        <Section title="Plan a release"><ActionForm action={saveRelease} submit="Plan release" className="grid gap-3"><ProductSelect /><F label="Version"><input required name="version" placeholder="1.4.0" className={inp} /></F><F label="Planned for"><input type="date" name="planned_for" className={inp} /></F><F label="Notes"><input name="notes" className={inp} /></F></ActionForm></Section>
        <Section title="Log a deployment"><ActionForm action={logDeployment} submit="Log deployment" className="grid gap-3"><ProductSelect /><F label="Release"><select name="release_id" className={inp}><option value="">None</option>{(releases ?? []).map((r: any) => <option key={r.id} value={r.id}>{pn(r.product_id)} {r.version}</option>)}</select></F>
          <F label="Environment"><select name="environment" className={inp}><option>production</option><option>staging</option></select></F><F label="Result"><select name="status" className={inp}><option>success</option><option>failed</option><option>rolled_back</option></select></F><F label="Commit hash"><input name="commit_sha" className={inp} /></F></ActionForm></Section></div>}
    </div>
  );
}
