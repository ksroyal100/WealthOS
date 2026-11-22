import AuthForm from '@/components/auth-form';
export const metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050607] p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="mb-4 text-xl font-semibold">Choose a new password</h1>
        <AuthForm mode="reset" portal="staff" />
        
      </div>
    </div>
  );
}
