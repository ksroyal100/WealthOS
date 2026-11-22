import '@fontsource-variable/inter';
import './globals.css';
import type { Metadata, Viewport } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'WealthOS | Financial Intelligence for the Future', template: '%s | WealthOS' },
  description: 'WealthOS is a technology and media company developing digital products, software platforms, financial technology solutions and educational media.',
  openGraph: { type: 'website', siteName: 'WealthOS', locale: 'en_US', title: 'WealthOS', description: 'Financial Intelligence for the Future.' },
  twitter: { card: 'summary_large_image', title: 'WealthOS', description: 'Financial Intelligence for the Future.' },
  alternates: { canonical: '/' },
};
export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#0B3B2E' }, { media: '(prefers-color-scheme: dark)', color: '#08140F' }] };

export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en-US"><body className="antialiased">{children}</body></html>);
}
