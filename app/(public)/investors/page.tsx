import CmsPage from '@/components/cms-page';
export const revalidate = 300;
export const metadata = { title: 'Investor and corporate information', description: 'Corporate information about WealthOS.', alternates: { canonical: '/investors' } };
export default function Page() {
  return <CmsPage slug="investors" title="Investor and corporate information" emptyTitle="Corporate information" emptyText="There is no investor or corporate information to publish yet. It will appear here when it is available." cta={{ href: "/contact", label: "Send an investor inquiry" }} />;
}
