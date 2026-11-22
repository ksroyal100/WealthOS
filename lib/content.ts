import type { QA } from '@/components/faq';

export const HOME_FAQ: QA[] = [
  { q: 'What is WealthOS?', a: 'WealthOS is a technology and media company developing digital products, software platforms, financial technology solutions and educational media.' },
  { q: 'Is Finora the only product?', a: 'Finora is a personal finance product within the WealthOS ecosystem. The platform is built so additional products can be added over time, and new products appear in the marketplace when they launch.' },
  { q: 'Do I need an account to use the website?', a: 'No. You can browse everything without an account. An account lets you subscribe to products, manage billing and contact support.' },
  { q: 'How do I create an account and keep it secure?', a: 'Choose Create account, confirm your email, and use a password of at least 12 characters. You can add two-step verification under Account, then Security.' },
  { q: 'How are payments handled?', a: 'Payments are processed by Stripe. WealthOS never stores your full card number.' },
  { q: 'Can I change or cancel a subscription?', a: 'Yes. Open Account, then Subscriptions, and use the secure billing portal.' },
  { q: 'Is WealthOS content financial advice?', a: 'No. Our media and tools are for general information and education only, and are not financial, investment, tax or legal advice.' },
  { q: 'How is my data protected?', a: 'Each customer can only access their own records, staff access is restricted by role and requires two-step verification, and sensitive actions are logged. Read the Security and trust center for details, including what we have not yet certified.' },
  { q: 'How do I contact WealthOS?', a: 'Use the Contact page for business, partnership, press and investor inquiries. Customers with an account can send support requests from their account.' },
];

export const SUPPORT_FAQ: { title: string; items: QA[] }[] = [
  { title: 'Getting started', items: [
    { q: 'How do I create an account?', a: 'Select Get started in the top right, fill in your details and confirm your email using the link we send you. If you do not see it, check your spam folder or use Resend email.' },
    { q: 'I did not get my confirmation email.', a: 'Wait a minute, check spam, then use the Resend email button on the sign-up screen. You can request a new link up to three times per hour.' },
    { q: 'How do I open a product I subscribed to?', a: 'Go to Account, then Overview. Your active products appear under Your products with an Open app button.' },
  ] },
  { title: 'Sign-in and security', items: [
    { q: 'I forgot my password.', a: 'On the sign-in page choose Forgot password and enter your email. We send a reset link that expires soon.' },
    { q: 'How do I turn on two-step verification?', a: 'Go to Account, then Security, and follow the steps with an authenticator app.' },
    { q: 'How do I sign out of every device?', a: 'Account, then Security, then Sign out of all devices.' },
  ] },
  { title: 'Billing', items: [
    { q: 'How do I update my card or download an invoice?', a: 'Go to Account, then Billing and orders, and open the billing portal.' },
    { q: 'How do I cancel?', a: 'Go to Account, then Subscriptions, and use the billing portal to cancel or change your plan.' },
    { q: 'A payment failed. What should I do?', a: 'Open the billing portal and update your payment method. If it keeps failing, contact us and include the date of the payment.' },
  ] },
  { title: 'Privacy', items: [
    { q: 'How do I delete my account and data?', a: 'Go to Account, then Profile and privacy, and choose Request account deletion. Our team reviews the request.' },
    { q: 'Where can I read how you use my data?', a: 'In our Privacy Policy, linked in the footer of every page.' },
  ] },
];
