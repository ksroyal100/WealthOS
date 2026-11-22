import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ProductCard, type CatalogProduct } from '@/components/product-card';
import Faq from '@/components/faq';
import { HOME_FAQ } from '@/lib/content';
import { fmtLong } from '@/lib/public-data';

export type Post = { slug: string; title: string; summary: string | null; category: string };
export type News = { type: string; slug: string; title: string; summary: string | null; published_at: string };
export type Leader = { key: string; title: string; full_name: string; headline: string | null; bio: string | null };
const d = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;
const svg = (p: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>;
const I = {
  shield: svg(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>),
  lock: svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>),
  card: svg(<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>),
  chat: svg(<path d="M4 5h16v11H8l-4 4zM8 9h8M8 12h5" />),
  grid: svg(<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />),
  user: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  book: svg(<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11" />),
  brief: svg(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" /></>),
  code: svg(<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14" />),
  flask: svg(<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" />),
  doc: svg(<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" />),
  eye: svg(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
};

const TRUST = [[I.lock, 'Secure sign-in', 'Optional two-step verification for every customer account.'], [I.eye, 'Private by design', 'Each customer can only see their own records, enforced by the database.'], [I.card, 'Payments through Stripe', 'WealthOS never stores your full card number.'], [I.chat, 'Support in your account', 'Private conversations with our team, in one place.']] as const;
const MEDIA = [['Financial Education', 'financial-education', 'Clear explanations of money and personal finance.', I.book], ['Business', 'business', 'Insights on building and running businesses.', I.brief], ['Technology', 'technology', 'Analysis of the technology shaping finance and business.', I.code], ['Research', 'research', 'Research and publications from WealthOS Media.', I.flask]] as const;
const SECURITY = [['Encrypted connections', 'Every page is served over HTTPS and browsers are told to always use it.', I.lock], ['Hashed passwords', 'Passwords are hashed by our authentication provider and must be at least 12 characters.', I.shield], ['Two-step verification', 'Available to every customer, and required for our own staff.', I.user], ['Isolated customer data', 'Row-level security means each customer can only read their own records.', I.eye], ['Private documents', 'Confidential files sit in private storage, behind specific permissions, with every download logged.', I.doc], ['Approvals and audit trail', 'Sensitive actions need a second person, and every change is written to an append-only log.', I.shield], ['Rate-limited sign-in', 'Repeated failed attempts are slowed down and raise alerts for our team.', I.lock], ['Signed integrations', 'Data from our products and payment provider is cryptographically verified.', I.code]] as const;

/** Every dynamic section renders only when approved content exists. Nothing is filled in with placeholders. */
export default function HomeView({ products, posts, news, leaders }: { products: CatalogProduct[]; posts: Post[]; news: News[]; leaders: Leader[] }) {
  const featured = products.find((p) => p.slug === 'finora') ?? products.find((p) => p.status === 'live');
  const latest = news[0];
  return (
    <>
      {/* ============ 1. hero ============ */}
      <section className="hero">
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="wrap">
          {latest ? <Link href={`/newsroom/${latest.slug}`} className="pillnote up"><b>News</b>{latest.title}</Link>
            : featured ? <Link href={`/marketplace/${featured.slug}`} className="pillnote up"><b>Product</b>WealthOS presents {featured.name}</Link> : null}
          <h1 className="up" style={d(0.08)}>Financial Intelligence for the Future.</h1>
          <p className="lede up" style={d(0.16)}>WealthOS is a technology and media company developing digital products, software platforms, financial technology solutions and educational media.</p>
          <div className="actions up" style={d(0.24)}><Link href="/marketplace" className="btn solid">Explore products</Link><Link href="/about" className="btn glass">About WealthOS</Link></div>
          <p className="fine up" style={d(0.3)}>Already have an account? <Link href="/account/login">Sign in</Link></p>
          <div className="stage up" style={d(0.45)} aria-hidden="true">
            <span className="floatchip a"><em />Overview</span><span className="floatchip b"><em />Goals on track</span>
            <div className="device">
              <div className="dots"><i /><i /><i /></div>
              <div className="dgrid">
                <div className="gcard"><small>Monthly overview</small>
                  <svg viewBox="0 0 520 170" preserveAspectRatio="none"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34D9A5" stopOpacity=".4" /><stop offset="1" stopColor="#34D9A5" stopOpacity="0" /></linearGradient><linearGradient id="gl" x1="0" x2="1"><stop offset="0" stopColor="#34D9A5" /><stop offset="1" stopColor="#22B8E0" /></linearGradient></defs>
                    <path d="M0 140 C60 130 90 120 140 100 S230 90 280 60 S400 40 520 14 L520 170 L0 170Z" fill="url(#ga)" /><path className="line" d="M0 140 C60 130 90 120 140 100 S230 90 280 60 S400 40 520 14" fill="none" stroke="url(#gl)" strokeWidth="4" strokeLinecap="round" /></svg></div>
                <div className="stack2">
                  <div className="gcard"><small>Budget</small><div className="bar2"><i style={{ '--w': '72%' } as CSSProperties} /></div><div className="bar2"><i style={{ '--w': '48%' } as CSSProperties} /></div></div>
                  <div className="gcard"><small>Savings goal</small><div className="ringwrap"><div className="ring" /><div className="bar2" style={{ flex: 1 }}><i style={{ '--w': '68%' } as CSSProperties} /></div></div></div>
                </div>
              </div>
            </div>
          </div>
          <p className="samplenote">Illustrative interface. Not real customer data.</p>
        </div>
      </section>

      {/* ============ 2. trust strip ============ */}
      <div className="strip"><div className="wrap strip-grid">{TRUST.map(([ic, t, s], i) => (<div className="strip-item reveal" style={d(i * 0.08)} key={t}><span className="ico">{ic}</span><div><b>{t}</b><span>{s}</span></div></div>))}</div></div>

      {/* ============ 3. what WealthOS is ============ */}
      <section className="sec" aria-label="What WealthOS is">
        <div className="wrap statement reveal">
          <p className="kick">What WealthOS is</p>
          <h2 className="big">One parent company. A growing ecosystem of digital products and educational media.</h2>
          <p className="small">WealthOS is the parent company. Finora, a personal finance product, is part of the ecosystem today. The company is structured so that additional products, business divisions and subsidiaries can be added over time without starting over, and every unit is clearly separated between an internal division and a registered legal entity.</p>
        </div>
      </section>

      {/* ============ 4. the two divisions ============ */}
      <section className="sec tint" aria-labelledby="divisions">
        <div className="wrap">
          <div className="head reveal"><p className="kick">Business divisions</p><h2 className="title" id="divisions">Technology and media, under one roof.</h2><p className="sub">Two connected businesses that share one mission: help people understand and use financial intelligence.</p></div>
          <div className="duo">
            <article className="bigcard dk reveal">
              <h3>WealthOS Technology</h3><p>We design and develop digital products, software platforms and financial technology solutions.</p>
              <ul className="ticks"><li>Digital products</li><li>Software platforms</li><li>Financial technology solutions</li><li>A marketplace for discovering products</li></ul>
              <div className="actions"><Link href="/tech" className="btn light">Explore technology</Link><Link href="/marketplace" className="btn glass">Visit the marketplace</Link></div>
            </article>
            <article className="bigcard reveal" style={d(0.1)}>
              <h3>WealthOS Media</h3><p>Educational media that makes finance, business and technology easier to understand.</p>
              <ul className="ticks"><li>Financial education</li><li>Business and technology insights</li><li>Research and publications</li><li>Documentaries and video</li></ul>
              <div className="actions"><Link href="/media" className="btn solid">Explore media</Link><Link href="/newsroom" className="btn">Read the newsroom</Link></div>
            </article>
          </div>
        </div>
      </section>

      {/* ============ 5. featured product ============ */}
      {featured && (
        <section className="sec" aria-labelledby="featured">
          <div className="wrap">
            <div className="showcase reveal">
              <div className="copy">
                <p className="presents">WealthOS presents</p>
                <h2 id="featured">{featured.name}</h2>
                <p className="tag">{featured.tagline}</p>
                <p className="desc">{featured.name} is a personal finance product within the WealthOS ecosystem. Create a WealthOS account to explore plans, subscribe and manage everything from one place.</p>
                <div className="actions"><Link href={`/marketplace/${featured.slug}`} className="btn solid">Explore {featured.name}</Link><Link href="/pricing" className="btn glass">See pricing</Link></div>
              </div>
              <div className="visual" aria-hidden="true">
                <div><div className="phone"><div className="screen"><div className="notch" />
                  <div className="gcard" style={{ minHeight: 0, marginBottom: 14 }}><small>This month</small><div className="bar2"><i style={{ '--w': '64%' } as CSSProperties} /></div></div>
                  {[0, 1, 2, 3].map((n) => <div className="row" key={n}><i /><span><b style={{ width: `${70 - n * 9}%` }} /><u /></span></div>)}
                </div></div><p className="note">Illustrative screen. Not real data.</p></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ 6. marketplace ============ */}
      <section className="sec tint" aria-labelledby="market">
        <div className="wrap">
          <div className="head reveal"><p className="kick">Marketplace</p><h2 className="title" id="market">Every product has its own home.</h2><p className="sub">Each WealthOS product has a page with its plans, documentation and support information. New products appear here as they launch.</p></div>
          <div className="grid3">
            {products.slice(0, 5).map((p, i) => <div className="reveal" style={d(i * 0.07)} key={p.slug}><ProductCard p={p} /></div>)}
            <div className="reveal" style={d(products.length * 0.07)}><div className="pcard more"><div className="top"><span>Coming</span><span className="badge b-coming_soon">Over time</span></div><h3>More products</h3><p>The platform is designed so new products can be added without redesigning the company website.</p></div></div>
          </div>
          <p className="reveal" style={{ textAlign: 'center', marginTop: 36 }}><Link href="/marketplace" className="btn">Browse the marketplace</Link></p>
        </div>
      </section>

      {/* ============ 7. customer ecosystem ============ */}
      <section className="sec" aria-labelledby="customers">
        <div className="wrap">
          <div className="head reveal"><p className="kick">Customer ecosystem</p><h2 className="title" id="customers">One account for everything.</h2><p className="sub">Discover products, manage subscriptions and get help from the same place, with your data kept private.</p></div>
          <div className="grid3">
            {([[I.grid, 'Marketplace', 'Browse products, compare plans and read documentation before you commit.', '/marketplace', 'Visit the marketplace'], [I.card, 'Subscriptions', 'See your plans, renewal dates and purchase history, and manage billing in a secure portal.', '/account/subscriptions', 'Manage subscriptions'], [I.chat, 'Customer support', 'Send a request and follow the conversation privately inside your account.', '/support', 'Visit the help center']] as const).map(([ic, t, p, h, l], i) => (
              <article className="tile reveal" style={d(i * 0.08)} key={t}><span className="ico">{ic}</span><h3>{t}</h3><p>{p}</p><Link href={h} className="more">{l}</Link></article>))}
          </div>
        </div>
      </section>

      {/* ============ 8. how it works ============ */}
      <section className="sec tint" aria-labelledby="how">
        <div className="wrap">
          <div className="head reveal"><p className="kick">Getting started</p><h2 className="title" id="how">Up and running in three steps.</h2></div>
          <ol className="steps">{([['Create your account', 'Sign up with your email, confirm it, and choose a strong password of at least 12 characters.'], ['Choose a product', 'Browse the marketplace, compare plans and subscribe to the product that fits you.'], ['Manage it in one place', 'Track subscriptions, update billing, turn on two-step verification and contact support from your account.']] as const).map(([t, p], i) => (<li className="reveal" style={d(i * 0.1)} key={t}><h3>{t}</h3><p>{p}</p></li>))}</ol>
          <div className="actions reveal" style={{ justifyContent: 'center', marginTop: 44 }}><Link href="/account/register" className="btn solid">Create your account</Link><Link href="/pricing" className="btn">See pricing</Link></div>
        </div>
      </section>

      {/* ============ 9. media ============ */}
      <section className="sec" aria-labelledby="media">
        <div className="wrap">
          <div className="head reveal"><p className="kick">WealthOS Media</p><h2 className="title" id="media">Understand more. Decide better.</h2><p className="sub">Four areas of coverage, written and reviewed before they are published.</p></div>
          <div className="quad">{MEDIA.map(([t, slug, p, ic], i) => (<article className="tile reveal" style={d(i * 0.07)} key={slug}><span className="ico">{ic}</span><h3>{t}</h3><p>{p}</p><Link href={`/media/${slug}`} className="more">Explore {t}</Link></article>))}</div>
          {posts.length > 0 && (<div style={{ marginTop: 56 }}><h3 className="reveal" style={{ fontSize: '1.6rem', letterSpacing: '-.03em', margin: '0 0 20px' }}>Latest publications</h3>
            <div className="grid3">{posts.map((p, i) => (<article className="tile reveal" style={d(i * 0.07)} key={p.slug}><div style={{ color: 'var(--acc)', fontWeight: 600, fontSize: '.9rem' }}>{p.category.replace(/_/g, ' ')}</div><h3 style={{ marginTop: 8 }}><Link href={`/media/${p.slug}`} style={{ textDecoration: 'none' }}>{p.title}</Link></h3>{p.summary && <p>{p.summary}</p>}</article>))}</div></div>)}
        </div>
      </section>

      {/* ============ 10. newsroom ============ */}
      {news.length > 0 && (
        <section className="sec tint" aria-labelledby="news">
          <div className="wrap">
            <div className="head reveal"><p className="kick">Newsroom</p><h2 className="title" id="news">Latest announcements.</h2></div>
            <ul className="news reveal">{news.map((n) => (<li key={n.type + n.slug}><time dateTime={n.published_at}>{fmtLong(n.published_at)}</time><div><h3><Link href={`/newsroom/${n.slug}`}>{n.title}</Link></h3>{n.summary && <p>{n.summary}</p>}</div></li>))}</ul>
            <p className="reveal" style={{ marginTop: 28 }}><Link href="/newsroom" className="back">All news and press releases</Link></p>
          </div>
        </section>
      )}

      {/* ============ 11. security (dark) ============ */}
      <section className="sec dark" aria-labelledby="trust">
        <div className="wrap">
          <div className="head reveal"><p className="kick">Security and trust</p><h2 className="title" id="trust">Built secure. Built to earn trust.</h2><p className="sub">Security is part of how WealthOS is built, not an add-on. Here is what protects your account and your data today.</p></div>
          <div className="quad">{SECURITY.map(([t, p, ic], i) => (<article className="tile reveal" style={d((i % 4) * 0.06)} key={t}><span className="ico">{ic}</span><h3>{t}</h3><p>{p}</p></article>))}</div>
          <p className="sub reveal" style={{ margin: '40px auto 0', textAlign: 'center', fontSize: '1rem' }}>WealthOS has not yet completed formal compliance audits such as SOC 2 or ISO 27001. We will say so plainly on our security page when that changes.</p>
          <div className="actions reveal" style={{ justifyContent: 'center', marginTop: 28 }}><Link href="/security" className="btn solid">Security and trust center</Link><Link href="/privacy" className="btn glass">Privacy policy</Link></div>
        </div>
      </section>

      {/* ============ 12. a company built to be transparent ============ */}
      <section className="sec" aria-labelledby="company">
        <div className="wrap">
          <div className="head reveal"><p className="kick">The company</p><h2 className="title" id="company">Open about how we are organized.</h2><p className="sub">We publish who leads WealthOS and how the company is structured, and only after the information has been verified.</p></div>
          <div className="cols" style={{ ['--n' as string]: 3 } as CSSProperties}>
            <div className="col reveal"><h3>Corporate structure</h3><p>See the parent company, its divisions and any registered entities. Legal details appear only when an entity is actually registered.</p><Link className="more" href="/corporate/structure">View the structure</Link></div>
            <div className="col reveal" style={d(0.08)}><h3>Governance</h3><p>How decisions are made and how sensitive actions are approved and recorded.</p><Link className="more" href="/governance">Read about governance</Link></div>
            <div className="col reveal" style={d(0.16)}><h3>Mission and vision</h3><p>Where WealthOS is going and why, in our own words once approved for publication.</p><Link className="more" href="/mission">Our mission and vision</Link></div>
          </div>
          {leaders.length > 0 && (<div style={{ marginTop: 56 }}><h3 className="reveal" style={{ fontSize: '1.6rem', letterSpacing: '-.03em', margin: '0 0 20px' }}>Leadership</h3><div className="leaders">{leaders.map((l) => (<article className="leader reveal" key={l.key}><h3>{l.full_name}</h3><div className="role">{l.title}</div>{l.headline && <p>{l.headline}</p>}</article>))}</div>
            <p className="reveal" style={{ marginTop: 24 }}><Link href="/leadership" className="back">Meet the leadership team</Link></p></div>)}
        </div>
      </section>

      {/* ============ 13. work with us ============ */}
      <section className="sec tint" aria-labelledby="engage">
        <div className="wrap">
          <div className="head reveal"><p className="kick">Work with us</p><h2 className="title" id="engage">Join, partner or invest.</h2></div>
          <div className="grid3">
            {([[I.user, 'Careers', 'See open positions at WealthOS, when they are available.', '/careers', 'View careers'], [I.brief, 'Partnerships', 'Interested in working together? Start a conversation with our team.', '/partnerships', 'Explore partnerships'], [I.doc, 'Investors and corporate information', 'Corporate information is published here when it is available.', '/investors', 'Corporate information']] as const).map(([ic, t, p, h, l], i) => (
              <article className="tile reveal" style={d(i * 0.08)} key={t}><span className="ico">{ic}</span><h3>{t}</h3><p>{p}</p><Link href={h} className="more">{l}</Link></article>))}
          </div>
        </div>
      </section>

      {/* ============ 14. FAQ ============ */}
      <section className="sec" aria-labelledby="faq">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="head reveal"><p className="kick">Questions</p><h2 className="title" id="faq">Everything you might want to know.</h2></div>
          <div className="reveal"><Faq items={HOME_FAQ} /></div>
          <p style={{ textAlign: 'center', marginTop: 32 }}><Link href="/support" className="back">Visit the help center</Link></p>
        </div>
      </section>

      {/* ============ 15. closing call to action ============ */}
      <section className="ctaband">
        <div className="wrap reveal">
          <h2>Start with WealthOS.</h2>
          <p>Create an account to explore products and manage your subscriptions, or get in touch with our team.</p>
          <div className="actions"><Link href="/account/register" className="btn solid">Create your account</Link><Link href="/contact" className="btn glass">Contact us</Link></div>
        </div>
      </section>
    </>
  );
}
