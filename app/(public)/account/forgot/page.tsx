import AuthForm from '@/components/auth-form';
export const metadata = { title: 'Reset your password', robots: { index: false } };
export default function Page() {
  return (
    <section className="sec"><div className="wrap"><div className="authbox">
      <h1 className="title" style={{ fontSize: '2.4rem' }}>Reset your password</h1>
      <p className="sub" style={{ fontSize: '1rem' }}>Enter your email and we will send you a link.</p>
      <AuthForm mode="forgot" portal="customer" />
    </div></div></section>
  );
}
