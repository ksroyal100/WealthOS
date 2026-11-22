import CmsPage from '@/components/cms-page';
export const revalidate = 300;
export const metadata = { title: 'Governance', description: 'How WealthOS is governed.', alternates: { canonical: '/governance' } };
export default function Page() {
  return <CmsPage slug="governance" title="Governance" emptyTitle="Governance information" emptyText="Information about how WealthOS is governed will be published here when it is available." />;
}
