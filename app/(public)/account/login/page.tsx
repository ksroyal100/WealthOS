import AuthForm from '@/components/auth-form';
export const metadata = { title: 'Sign in', robots: { index: false } };
export default function Page() {
  return (
    <section className="sec"><div className="wrap"><div className="authbox">
      <h1 className="title" style={{ fontSize: '2.4rem' }}>Sign in</h1>
      <p className="sub" style={{ fontSize: '1rem' }}>Welcome back. Sign in to manage your WealthOS account.</p>
      <AuthForm mode="login" portal="customer" />
    </div></div></section>
  );
}
