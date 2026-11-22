import CmsPage from '@/components/cms-page';
export const revalidate = 300;
export const metadata = { title: 'About WealthOS', description: 'WealthOS is a technology and media company developing digital products, software platforms, financial technology solutions and educational media.', alternates: { canonical: '/about' } };
export default function About() {
  return (
    <CmsPage slug="about" title="About WealthOS" intro="WealthOS is a technology and media company developing digital products, software platforms, financial technology solutions and educational media." emptyTitle="Finora is part of the WealthOS ecosystem" emptyText="Finora is a personal finance product within the WealthOS ecosystem. WealthOS is the parent company, and its structure is designed to support additional products and business divisions over time." />
  );
}
