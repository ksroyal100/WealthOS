import CmsPage from '@/components/cms-page';
export const revalidate = 300;
export const metadata = { title: 'Our mission and vision', description: 'The mission and vision of WealthOS.', alternates: { canonical: '/mission' } };
export default function Page() {
  return <CmsPage slug="mission" title="Our mission and vision" emptyTitle="Our mission and vision" emptyText="Our mission and vision will be published here once they have been approved." />;
}
