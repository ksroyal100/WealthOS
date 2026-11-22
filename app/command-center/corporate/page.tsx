import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, Table, Td, F, inp, SubNav } from '@/components/cc/kit';
import { saveOrgUnit } from '@/lib/cc/actions-corporate';

export const metadata = { title: 'Corporate structure' };
const KINDS = ['parent_company', 'division', 'department', 'team', 'subsidiary'];

function Fields({ u, units }: { u?: any; units: any[] }) {
  return (<>
    {u && <input type="hidden" name="id" value={u.id} />}
    <F label="Name"><input required name="name" defaultValue={u?.name} className={inp} /></F>
    <F label="Address slug"><input required name="slug" defaultValue={u?.slug} readOnly={!!u} pattern="[a-z0-9-]{2,60}" className={inp} /></F>
    <F label="Type"><select name="kind" defaultValue={u?.kind ?? 'department'} className={inp}>{KINDS.map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}</select></F>
    <F label="Reports into"><select name="parent_slug" defaultValue={units.find((x) => x.id === u?.parent_id)?.slug ?? ''} className={inp}><option value="">None (top level)</option>{units.filter((x) => x.id !== u?.id).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></F>
    <F label="Status"><select name="status" defaultValue={u?.status ?? 'planned'} className={inp}>{['planned', 'active', 'paused', 'closed'].map((k) => <option key={k}>{k}</option>)}</select></F>
    <F label="Legal status"><select name="legal_status" defaultValue={u?.legal_status ?? 'unknown'} className={inp}><option value="unknown">Unknown, not stated</option><option value="not_a_legal_entity">Internal unit, not a legal entity</option><option value="legal_entity">Registered legal entity</option></select></F>
    <F label="Registered name (legal entities only)"><input name="legal_name" defaultValue={u?.legal_name ?? ''} className={inp} /></F>
    <F label="Jurisdiction (legal entities only)"><input name="jurisdiction" defaultValue={u?.jurisdiction ?? ''} className={inp} /></F>
    <F label="Registration number (never shown publicly)"><input name="registration_number" defaultValue={u?.registration_number ?? ''} className={inp} /></F>
    <F label="Description" span={2}><input name="description" defaultValue={u?.description ?? ''} maxLength={500} className={inp} /></F>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="public_listed" defaultChecked={u?.public_listed} /> Show on the public website (needs approval permission)</label>
  </>);
}

export default async function Corporate() {
  const staff = await requirePermission('org', 'view');
  const { data } = await admin().from('org_units').select('*').order('created_at');
  const units = (data ?? []) as any[];
  const [canCreate, canEdit] = await Promise.all([can(staff, 'org', 'create'), can(staff, 'org', 'edit')]);
  const depth = (u: any) => { let d = 0, c = u; while (c?.parent_id && d < 6) { c = units.find((x) => x.id === c.parent_id); d++; } return d; };
  const ordered: any[] = []; const walk = (pid: string | null) => units.filter((u) => u.parent_id === pid).forEach((u) => { ordered.push(u); walk(u.id); }); walk(null);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Corporate structure" desc="The parent company, divisions, departments, teams and subsidiaries. A unit is never assumed to be a legal entity: legal details exist only when someone records them, and nothing is public until it is listed with approval." />
      <SubNav current="/command-center/corporate" items={[['Structure', '/command-center/corporate'], ['Leadership', '/command-center/corporate/leadership'], ['Website content', '/command-center/cms']]} />
      <Table caption="Organization units" head={['Unit', 'Type', 'Status', 'Legal status', 'Public', '']} empty={ordered.length === 0}>
        {ordered.map((u) => (
          <tr key={u.id}><Td><span style={{ paddingLeft: depth(u) * 18 }} className="font-medium">{u.name}</span></Td><Td>{u.kind.replace('_', ' ')}</Td><Td><Pill tone={toneFor(u.status)}>{u.status}</Pill></Td>
            <Td>{u.legal_status === 'legal_entity' ? `${u.legal_name ?? 'Registered entity'}${u.jurisdiction ? `, ${u.jurisdiction}` : ''}` : u.legal_status === 'not_a_legal_entity' ? 'Internal unit' : 'Not stated'}</Td>
            <Td>{u.public_listed ? <Pill tone="good">Listed</Pill> : <Pill>Hidden</Pill>}</Td>
            <Td>{canEdit && <details><summary className="cursor-pointer text-xs underline">Edit</summary><div className="mt-3 w-[min(90vw,48rem)]"><ActionForm action={saveOrgUnit} submit="Save" resetOnSuccess={false}><Fields u={u} units={units} /></ActionForm></div></details>}</Td></tr>))}
      </Table>
      {canCreate && <div className="mt-6"><Section title="Add a unit"><ActionForm action={saveOrgUnit} submit="Add unit"><Fields units={units} /></ActionForm></Section></div>}
    </div>
  );
}
