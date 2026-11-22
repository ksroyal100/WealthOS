import { LegalPage } from '@/components/legal';
export const metadata = { title: 'Terms of Service' };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="[MM/DD/YYYY]">
      <p>These terms govern your use of WealthOS websites and products. By using them you agree to these terms.</p>
      <h2>Accounts</h2>
      <p>You are responsible for your account and for keeping your password secure. Give us accurate information and tell us promptly about any unauthorized use.</p>
      <h2>Subscriptions and billing</h2>
      <p>Paid plans are billed in U.S. dollars on the schedule shown at checkout. [State whether plans renew automatically, how and where to cancel, and the refund policy. Several U.S. states require clear automatic-renewal disclosures and an easy way to cancel.]</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse our products, attempt to access systems or data you are not authorized to access, or use them to break the law.</p>
      <h2>Not financial advice</h2>
      <p>WealthOS products and media are provided for general information and tools to help you organize your own finances. They are not financial, investment, tax or legal advice, and WealthOS is not your advisor. [Add product-specific disclosures after review.]</p>
      <h2>Disclaimers and limits of liability</h2>
      <p>[Attorney to provide warranty disclaimer and limitation of liability language appropriate to your state.]</p>
      <h2>Governing law</h2>
      <p>[State] law governs these terms. [Dispute resolution and venue to be set by counsel.]</p>
      <h2>Contact</h2>
      <p>[Company legal name, mailing address and contact email]</p>
    </LegalPage>
  );
}
