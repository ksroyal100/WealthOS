import { requireCustomer } from '@/lib/account/session';
import AccountNav from '@/components/account-nav';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireCustomer();
  const name = (user.user_metadata?.full_name as string | undefined)?.trim() || (user.email ?? '').split('@')[0];
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join('') || '?';
  return (
    <section className="sec" style={{ paddingTop: 36 }}>
      <div className="wrap portal">
        <aside className="pside">
          <div className="pwho"><span className="avatar lg" aria-hidden="true">{ini}</span><div><b>{name}</b><small>{user.email}</small></div></div>
          <AccountNav />
        </aside>
        <div className="pmain">{children}</div>
      </div>
    </section>
  );
}
