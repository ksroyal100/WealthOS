import CmsPage from '@/components/cms-page';
export const revalidate = 300;
export const metadata = { title: 'Partnerships', description: 'Partner with WealthOS.', alternates: { canonical: '/partnerships' } };
export default function Page() {
  return <CmsPage slug="partnerships" title="Partnerships" emptyTitle="Partnerships" emptyText="We have no partnerships to announce. If you would like to work with us, get in touch." cta={{ href: "/contact", label: "Start a conversation" }} />;
}
