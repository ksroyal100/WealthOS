import { LegalPage } from '@/components/legal';
export const metadata = { title: 'Privacy Policy' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="[MM/DD/YYYY]">
      <p>This policy explains what personal information WealthOS ("we", "us") collects through our websites and products, how we use it, and the choices you have.</p>
      <h2>Information we collect</h2>
      <ul><li>Account information, such as your name, email address and password (stored only as a secure hash).</li><li>Subscription and billing details handled by our payment processor [name the processor]. We do not store full card numbers.</li><li>Product usage information needed to run and improve our products.</li><li>Messages you send us, such as support requests.</li></ul>
      <h2>Cookies</h2>
      <p>We use cookies that are strictly necessary to keep you signed in and secure your session. [If analytics or advertising tools are added, describe them here and provide an opt-out.]</p>
      <h2>How we use information</h2>
      <p>To provide and support our products, process payments, protect against fraud and abuse, communicate with you, and meet legal obligations.</p>
      <h2>How we share information</h2>
      <p>We share information with service providers that help us operate (for example hosting, payments and email) under contracts that limit their use of it, and when required by law. [Confirm whether WealthOS sells or shares personal information for cross-context behavioral advertising, and state it plainly.]</p>
      <h2 id="your-choices">Your privacy choices</h2>
      <p>Depending on where you live, including California, Colorado, Connecticut, Virginia and other states, you may have the right to know what we collect, request a copy, correct or delete your information, and opt out of the sale or sharing of personal information and targeted advertising. To make a request, contact us at the address below. We will not discriminate against you for exercising these rights. [Add the verification process and the response timeline required by applicable law.]</p>
      <h2>Retention and security</h2>
      <p>We keep information only as long as needed for the purposes above or as the law requires, and we use technical and organizational safeguards to protect it. No system is completely secure.</p>
      <h2>Children</h2>
      <p>Our products are not directed to children under 13, and we do not knowingly collect their personal information.</p>
      <h2>Contact</h2>
      <p>[Company legal name, mailing address and privacy contact email]</p>
    </LegalPage>
  );
}
