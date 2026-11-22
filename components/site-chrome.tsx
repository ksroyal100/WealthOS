import Link from 'next/link';
import HeaderClient, { type MenuProduct } from '@/components/header-client';

export function SiteHeader({ products }: { products: MenuProduct[] }) {
  return (<header className="top"><HeaderClient products={products} /></header>);
}

export function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="bottom">
      <div className="wrap">
        <div className="fgrid">
          <div><div style={{ color: '#fff', fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.3rem', fontWeight: 700 }}>WealthOS</div><p style={{ maxWidth: '24em' }}>Financial Intelligence for the Future.</p></div>
          <div><h2 className="fh">Corporate</h2><Link href="/about">About us</Link><Link href="/mission">Our mission</Link><Link href="/leadership">Leadership</Link><Link href="/governance">Governance</Link><Link href="/corporate/structure">Corporate structure</Link><Link href="/divisions">Business divisions</Link></div>
          <div><h2 className="fh">Media and news</h2><Link href="/media/financial-education">Financial Education</Link><Link href="/media/business">Business</Link><Link href="/media/technology">Technology</Link><Link href="/media/research">Research</Link><Link href="/newsroom">Newsroom</Link></div>
          <div><h2 className="fh">Technology</h2><Link href="/tech">Digital platforms</Link><Link href="/marketplace">Marketplace</Link><Link href="/pricing">Pricing</Link><Link href="/security">Security and trust</Link></div>
          <div><h2 className="fh">Engage</h2><Link href="/careers">Careers</Link><Link href="/partnerships">Partnerships</Link><Link href="/investors">Investors</Link><Link href="/contact">Contact</Link><Link href="/support">Support</Link><Link href="/account/login">Sign in</Link></div>
        </div>
        <p className="legalnote">WealthOS Media content is for general information and education only. It is not financial, investment, tax or legal advice. Consider speaking with a qualified professional about your own situation.</p>
        <div className="legal">
          <span>© {year} WealthOS. All rights reserved.</span>
          <span style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><Link href="/privacy">Privacy Policy</Link><Link href="/privacy#your-choices">Your Privacy Choices</Link><Link href="/terms">Terms of Service</Link><Link href="/accessibility">Accessibility</Link></span>
        </div>
      </div>
    </footer>
  );
}
