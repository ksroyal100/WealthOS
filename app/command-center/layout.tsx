import { requireStaff, can } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import CcNav, { type NavGroup } from '@/components/cc/nav';

export const dynamic = 'force-dynamic';
const B = '/command-center';
const GROUPS: { title: string; items: [string, string, string | null][] }[] = [
  { title: 'Overview', items: [['Dashboard', B, 'dashboard'], ['Inbox', `${B}/notifications`, null]] },
  { title: 'Corporate', items: [['Structure', `${B}/corporate`, 'org'], ['Leadership', `${B}/corporate/leadership`, 'leadership'], ['Website content', `${B}/cms`, 'cms'], ['Publications', `${B}/publications`, 'media']] },
  { title: 'Finance', items: [['Ledger', `${B}/finance`, 'finance'], ['Receivables and payables', `${B}/finance/ap-ar`, 'finance'], ['Invoices', `${B}/finance/invoices`, 'finance'], ['Budgets', `${B}/finance/budgets`, 'finance'], ['Vendors', `${B}/finance/vendors`, 'finance'], ['Approvals', `${B}/approvals`, 'finance'], ['Currency and consolidation', `${B}/finance/fx`, 'fx'], ['Banking', `${B}/banking`, 'banking']] },
  { title: 'Product and engineering', items: [['Products', `${B}/products`, 'products'], ['Projects', `${B}/projects`, 'projects'], ['Releases and deployments', `${B}/engineering`, 'engineering'], ['Incidents', `${B}/engineering/incidents`, 'engineering'], ['Technical docs', `${B}/engineering/docs`, 'engineering']] },
  { title: 'People', items: [['Directory', `${B}/hr`, 'hr'], ['Recruitment', `${B}/hr/recruitment`, 'hr'], ['Leave', `${B}/hr/leave`, 'hr']] },
  { title: 'Growth and marketing', items: [['Companies and contacts', `${B}/crm`, 'crm'], ['Sales pipeline', `${B}/crm/pipeline`, 'crm'], ['Partnerships', `${B}/crm/partnerships`, 'crm'], ['Business inquiries', `${B}/crm/inquiries`, 'crm'], ['Campaigns', `${B}/marketing`, 'marketing'], ['Media', `${B}/media`, 'media']] },
  { title: 'Legal', items: [['Documents', `${B}/legal`, 'legal']] },
  { title: 'Customers', items: [['Support requests', `${B}/support`, 'support']] },
  { title: 'Administration', items: [['Access and team', `${B}/team`, 'team'], ['Reports', `${B}/reports`, 'reports'], ['Audit log', `${B}/security`, 'audit']] },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  // Hiding links is a convenience only; every page and action re-checks permission on the server.
  const groups: NavGroup[] = [];
  for (const g of GROUPS) {
    const items: [string, string][] = [];
    for (const [label, href, res] of g.items) if (!res || (await can(staff, res, 'view'))) items.push([label, href]);
    if (items.length) groups.push({ title: g.title, items });
  }
  const { count } = await admin().from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', staff.userId).is('read_at', null);
  const unread = count ?? 0;
  const who = (
    <div className="border-t border-white/10 pt-3 text-xs text-slate-300"><div className="font-medium text-white">{staff.fullName}</div><div>{staff.designation ?? staff.roles.join(', ')}</div></div>
  );
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] md:flex">
      <a href="#cc-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <aside className="hidden w-64 shrink-0 flex-col bg-[#0B0F0E] p-4 md:flex md:h-screen md:sticky md:top-0">
        <div className="mb-5 px-3 text-base font-semibold tracking-tight text-white">WealthOS <span className="text-emerald-300">Command Center</span></div>
        <div className="flex-1 overflow-y-auto pr-1"><CcNav groups={groups} unread={unread} /></div>{who}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#0B0F0E]/95 px-4 py-3 text-white backdrop-blur md:hidden">
          <span className="font-semibold">WealthOS <span className="text-emerald-300">CC</span></span>
          <details className="relative"><summary className="cursor-pointer list-none rounded border border-white/30 px-3 py-1.5 text-sm">Menu{unread > 0 ? ` (${unread})` : ''}</summary>
            <div className="absolute right-0 mt-2 max-h-[80vh] w-72 overflow-y-auto rounded-2xl bg-[#0B0F0E] p-3 shadow-2xl"><CcNav groups={groups} unread={unread} />{who}</div></details>
        </header>
        <main id="cc-main" className="mx-auto w-full max-w-[1400px] p-4 md:p-10">{children}</main>
      </div>
    </div>
  );
}
