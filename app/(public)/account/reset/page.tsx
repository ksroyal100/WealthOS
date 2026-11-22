import AuthForm from '@/components/auth-form';
export const metadata = { title: 'Choose a new password', robots: { index: false } };
export default function Page() {
  return (
    <section className="sec"><div className="wrap"><div className="authbox">
      <h1 className="title" style={{ fontSize: '2.4rem' }}>Choose a new password</h1>
      <p className="sub" style={{ fontSize: '1rem' }}>Pick a strong password you do not use anywhere else.</p>
      <AuthForm mode="reset" portal="customer" />
    </div></div></section>
  );
}
