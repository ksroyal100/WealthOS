import AuthForm from '@/components/auth-form';
export const metadata = { title: 'WealthOS Command Center', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050607] p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="mb-4 text-xl font-semibold">WealthOS Command Center</h1>
        <AuthForm mode="login" portal="staff" />
        <p className="mt-4 text-xs text-slate-600">Authorized company members only. Access is monitored and logged.</p>
      </div>
    </div>
  );
}
