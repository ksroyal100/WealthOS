import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, F, inp, SubNav, fmtDateTime } from '@/components/cc/kit';
import { openIncident, addIncidentUpdate, setIncidentStatus } from '@/lib/cc/actions-eng';

export const metadata = { title: 'Incidents' };
const NAV: [string, string][] = [['Releases and deployments', '/command-center/engineering'], ['Incidents', '/command-center/engineering/incidents'], ['Technical docs', '/command-center/engineering/docs']];

export default async function Incidents() {
  const staff = await requirePermission('engineering', 'view'); const db = admin();
  const [{ data: inc }, { data: ups }, { data: products }, cc, ce] = await Promise.all([db.from('incidents').select('*').order('started_at', { ascending: false }).limit(100), db.from('incident_updates').select('*').order('at'), db.from('products').select('id,name'), can(staff, 'engineering', 'create'), can(staff, 'engineering', 'edit')]);
  const pn = (id: string | null) => (products ?? []).find((p: any) => p.id === id)?.name ?? 'General';
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Incidents" desc="Sev 1 and Sev 2 incidents raise a critical alert and notify the Founder and CEO automatically. Resolving the incident closes the alert." />
      <SubNav current="/command-center/engineering/incidents" items={NAV} />
      {cc && <Section title="Open an incident"><ActionForm action={openIncident} submit="Open incident"><F label="Title" span={2}><input required name="title" className={inp} /></F><F label="Severity"><select name="severity" className={inp}><option value="sev1">Sev 1: outage or data risk</option><option value="sev2">Sev 2: major degradation</option><option value="sev3" selected>Sev 3: minor</option><option value="sev4">Sev 4: cosmetic</option></select></F>
        <F label="Product"><select name="product_id" className={inp}><option value="">General</option>{(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F><F label="Summary" span={2}><input name="summary" className={inp} /></F></ActionForm></Section>}
      {(inc ?? []).length === 0 && <p className="text-sm text-slate-600">No incidents recorded.</p>}
      {(inc ?? []).map((i: any) => (
        <Section key={i.id} title={`${i.title} (${pn(i.product_id)})`} aside={<span className="flex gap-2"><Pill tone={toneFor(i.severity)}>{i.severity}</Pill><Pill tone={toneFor(i.status)}>{i.status}</Pill></span>}>
          <p className="text-sm text-slate-600">Started {fmtDateTime(i.started_at)}{i.resolved_at ? ` · resolved ${fmtDateTime(i.resolved_at)}` : ''}</p>{i.summary && <p className="mt-1 text-sm">{i.summary}</p>}
          <ul className="mt-3 divide-y text-sm">{(ups ?? []).filter((u: any) => u.incident_id === i.id).map((u: any) => <li key={u.id} className="py-1.5">{u.body}<span className="ml-2 text-xs text-slate-500">{fmtDateTime(u.at)}</span></li>)}</ul>
          {ce && <div className="mt-3 grid gap-3 md:grid-cols-2"><ActionForm action={addIncidentUpdate} submit="Post update" className="grid gap-2"><input type="hidden" name="incident_id" value={i.id} /><F label="Update"><input required name="body" className={inp} /></F></ActionForm>
            <ActionForm action={setIncidentStatus} submit="Set status" resetOnSuccess={false} className="grid gap-2"><input type="hidden" name="id" value={i.id} /><F label="Status"><select name="status" defaultValue={i.status} className={inp}>{['open', 'investigating', 'mitigated', 'resolved', 'closed'].map((s) => <option key={s}>{s}</option>)}</select></F><F label="Post-incident review (optional)"><input name="postmortem" className={inp} /></F></ActionForm></div>}
        </Section>))}
    </div>
  );
}
