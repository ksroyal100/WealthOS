import { requirePermission, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import ActionForm from '@/components/cc/action-form';
import { PageHeader, Section, Pill, toneFor, F, inp, SubNav, fmtDate } from '@/components/cc/kit';
import { saveLeadershipPosition, saveExecutive, verifyExecutive, setExecutiveVisibility } from '@/lib/cc/actions-corporate';

export const metadata = { title: 'Leadership' };

export default async function Leadership() {
  const staff = await requirePermission('leadership', 'view');
  const db = admin();
  const [{ data: positions }, { data: profiles }] = await Promise.all([db.from('leadership_positions').select('*').order('created_at'), db.from('executive_profiles').select('*')]);
  const [canEdit, canCreate, canApprove] = await Promise.all([can(staff, 'leadership', 'edit'), can(staff, 'leadership', 'create'), can(staff, 'leadership', 'approve')]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Leadership" desc="Positions can exist internally while vacant. A person appears on the public website only when their position is appointed, their profile has been verified by someone other than themselves, and it is set to public. Vacating a position hides the profile automatically." />
      <SubNav current="/command-center/corporate/leadership" items={[['Structure', '/command-center/corporate'], ['Leadership', '/command-center/corporate/leadership'], ['Website content', '/command-center/cms']]} />
      {(positions ?? []).map((p: any) => {
        const prof = (profiles ?? []).find((x: any) => x.position_id === p.id) as any;
        return (
          <Section key={p.id} title={p.title} aside={<Pill tone={toneFor(p.appointment_status === 'appointed' ? 'active' : 'planned')}>{p.appointment_status}</Pill>}>
            {canEdit && <ActionForm action={saveLeadershipPosition} submit="Save position" resetOnSuccess={false} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="id" value={p.id} />
              <F label="Appointment status"><select name="appointment_status" defaultValue={p.appointment_status} className={inp}><option value="vacant">Vacant</option><option value="announced">Announced</option><option value="acting">Acting</option><option value="appointed" disabled={!canApprove}>Appointed (needs approval permission)</option></select></F>
              <F label="Responsibilities" span={2}><input name="responsibilities" defaultValue={p.responsibilities ?? ''} className={inp} /></F></ActionForm>}
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2 text-sm font-medium">{prof ? 'Profile' : 'No one is assigned to this position'}</h3>
              {prof && <p className="mb-3 text-sm">{prof.full_name} · {prof.verified_at ? <Pill tone="good">Verified {fmtDate(prof.verified_at)}</Pill> : <Pill tone="warn">Not verified</Pill>} · visibility <b>{prof.visibility}</b></p>}
              {(canCreate || canEdit) && <ActionForm action={saveExecutive} submit={prof ? 'Save profile (requires re-verification)' : 'Create profile'} resetOnSuccess={false}>
                {prof && <input type="hidden" name="id" value={prof.id} />}<input type="hidden" name="position_id" value={p.id} />
                <F label="Full name"><input required name="full_name" defaultValue={prof?.full_name ?? ''} className={inp} /></F>
                <F label="Headline"><input name="headline" defaultValue={prof?.headline ?? ''} className={inp} /></F>
                <F label="Biography" span={3}><textarea name="bio" rows={3} defaultValue={prof?.bio ?? ''} className={inp} /></F></ActionForm>}
              {prof && canApprove && <div className="mt-3 flex flex-wrap gap-6">
                {!prof.verified_at && <ActionForm action={verifyExecutive} submit="Verify this profile" className="flex" compact><input type="hidden" name="id" value={prof.id} /></ActionForm>}
                {prof.verified_at && <ActionForm action={setExecutiveVisibility} submit="Apply visibility" className="flex flex-wrap items-end gap-3" compact resetOnSuccess={false}><input type="hidden" name="id" value={prof.id} />
                  <F label="Visibility"><select name="visibility" defaultValue={prof.visibility} className={inp}><option value="hidden">Hidden</option><option value="internal">Internal only</option><option value="public">Public website</option></select></F></ActionForm>}
              </div>}
            </div>
          </Section>);
      })}
    </div>
  );
}
