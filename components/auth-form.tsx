'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, signUp, requestReset, updatePassword, resendConfirmation } from '@/lib/auth/actions';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
type Portal = 'staff' | 'customer';

const schemas = {
  login: z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') }),
  register: z.object({ full_name: z.string().min(1, 'Enter your name'), email: z.string().email('Enter a valid email'), password: z.string().min(12, 'Use at least 12 characters') }),
  forgot: z.object({ email: z.string().email('Enter a valid email') }),
  reset: z.object({ password: z.string().min(12, 'Use at least 12 characters') }),
};
const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export default function AuthForm({ mode, portal }: { mode: Mode; portal: Portal }) {
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; s: string } | null>(null);
  const [needsResend, setNeedsResend] = useState(false);
  const [done, setDone] = useState<{ title: string; text: string; email?: string } | null>(null);
  const [resent, setResent] = useState('');
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<any>({ resolver: zodResolver(schemas[mode] as any) });
  const staff = portal === 'staff';
  // Already signed in? Skip the form and go straight to the account (customer pages only).
  useEffect(() => { if (staff || mode === 'reset') return; browserClient().auth.getSession().then(({ data }) => { if (data.session) window.location.replace('/account'); }); }, [staff, mode]);
  const c = staff
    ? { input: 'mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15', field: 'block text-sm font-medium', btn: 'w-full rounded-full bg-[#0A7A5C] p-3 font-medium text-white disabled:opacity-60', link: 'underline text-sm' }
    : { input: 'input', field: 'field', btn: 'btn solid', link: 'back' };

  const onSubmit = handleSubmit(async (v) => {
    setMsg(null); setNeedsResend(false);
    const r = mode === 'login' ? await signIn(portal, v as any) : mode === 'register' ? await signUp(v as any) : mode === 'forgot' ? await requestReset(portal, v as any) : await updatePassword(v as any);
    if (r.error) { setMsg({ t: 'err', s: r.error }); if (r.code === 'unconfirmed') setNeedsResend(true); return; }
    if (r.redirect) { window.location.href = r.redirect; return; }
    if (mode === 'login') { window.location.href = safeNext(new URLSearchParams(window.location.search).get('next')) ?? (staff ? '/command-center' : '/account'); return; }
    if (mode === 'reset') { window.location.href = staff ? '/command-center' : '/account'; return; }
    if (mode === 'register') return setDone({ title: 'Check your inbox', text: 'We sent a confirmation link to', email: String(v.email) });
    if (mode === 'forgot') return setDone({ title: 'Reset link sent', text: 'If an account exists for', email: String(v.email) });
  });

  async function resend() { const r = await resendConfirmation({ email: String(getValues('email') ?? '') }); setResent(r.error ?? r.message ?? 'Sent.'); }

  if (done) return (
    <div className="donecard" role="status">
      <div className="doneicon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></svg></div>
      <h2>{done.title}</h2>
      <p>{done.text} <b>{done.email}</b>. {mode === 'register' ? 'Click the link in that email to activate your account. It can take a minute, and may land in spam.' : 'The link expires soon, so use it right away.'}</p>
      {mode === 'register' && <><button className="btn" onClick={resend}>Resend email</button>{resent && <p className="ok" style={{ fontSize: '.9rem' }}>{resent}</p>}</>}
      <p style={{ marginTop: 18 }}><Link className={c.link} href={`${staff ? '/command-center' : '/account'}/login`}>Back to sign in</Link></p>
    </div>
  );

  const fld = (name: string, label: string, type = 'text', ac?: string) => (
    <label className={c.field}>{label}
      <input type={type} autoComplete={ac} aria-invalid={!!errors[name]} {...register(name)} className={c.input} />
      {errors[name] && <span role="alert" className={staff ? 'text-sm text-red-700' : 'err'} style={{ display: 'block', fontWeight: 400, fontSize: '.85rem' }}>{String(errors[name]?.message)}</span>}
    </label>
  );
  const base = staff ? '/command-center' : '/account';
  return (
    <form onSubmit={onSubmit} noValidate className={staff ? 'space-y-4' : undefined}>
      {mode === 'register' && fld('full_name', 'Full name', 'text', 'name')}
      {mode !== 'reset' && fld('email', staff ? 'Work email' : 'Email', 'email', 'email')}
      {mode !== 'forgot' && fld('password', mode === 'reset' ? 'New password' : 'Password', 'password', mode === 'login' ? 'current-password' : 'new-password')}
      {(mode === 'register' || mode === 'reset') && <p style={{ fontSize: '.82rem', opacity: 0.75, margin: '0 0 14px' }}>At least 12 characters. A long passphrase works well.</p>}
      {msg && <p role={msg.t === 'err' ? 'alert' : 'status'} className={msg.t === 'err' ? (staff ? 'text-sm text-red-700' : 'err') : (staff ? 'text-sm text-green-800' : 'ok')}>{msg.s}</p>}
      {needsResend && <p><button type="button" className={c.link} style={{ textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }} onClick={resend}>Resend confirmation email</button> {resent && <span className="ok">{resent}</span>}</p>}
      <button disabled={isSubmitting} className={c.btn} style={staff ? undefined : { width: '100%' }}>{isSubmitting ? 'Please wait…' : { login: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Set new password' }[mode]}</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
        {mode === 'login' && <><Link className={c.link} href={`${base}/forgot`}>Forgot password?</Link>{!staff && <Link className={c.link} href="/account/register">Create an account</Link>}</>}
        {(mode === 'register' || mode === 'forgot') && <Link className={c.link} href={`${base}/login`}>Back to sign in</Link>}
      </div>
    </form>
  );
}
