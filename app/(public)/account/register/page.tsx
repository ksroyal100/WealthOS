import AuthForm from '@/components/auth-form';
export const metadata = { title: 'Create your account', robots: { index: false } };
export default function Page() {
  return (
    <section className="sec"><div className="wrap"><div className="authbox">
      <h1 className="title" style={{ fontSize: '2.4rem' }}>Create your account</h1>
      <p className="sub" style={{ fontSize: '1rem' }}>One account for your WealthOS products, subscriptions and billing.</p>
      <AuthForm mode="register" portal="customer" />
    </div></div></section>
  );
}
