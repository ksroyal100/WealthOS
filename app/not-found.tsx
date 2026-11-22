import Link from 'next/link';
export default function NotFound() {
  return (<div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, fontFamily: 'inherit' }}><div><h1 style={{ fontSize: '2.4rem', letterSpacing: '-.03em' }}>Page not found</h1><p style={{ opacity: 0.7 }}>The page you are looking for does not exist or has moved.</p><Link href="/" style={{ textDecoration: 'underline' }}>Back to home</Link></div></div>);
}
