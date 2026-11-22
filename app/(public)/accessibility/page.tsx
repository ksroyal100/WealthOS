export const metadata = { title: 'Accessibility' };

export default function Accessibility() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <section className="sec"><div className="wrap prose" style={{ maxWidth: 780 }}>
      <h1 className="serif" style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', margin: 0, fontWeight: 600 }}>Accessibility</h1>
      <p>WealthOS wants everyone to be able to use our website and products. We design toward the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, including keyboard navigation, visible focus, sufficient color contrast, descriptive labels, and support for reduced motion and dark mode.</p>
      <p>We are still improving. If you find something hard to use, tell us what you were trying to do and we will work to fix it.</p>
      <p>{email ? <>Email <a href={`mailto:${email}`} style={{ textDecoration: 'underline' }}>{email}</a>.</> : 'Contact details will be published here.'}</p>
    </div></section>
  );
}
