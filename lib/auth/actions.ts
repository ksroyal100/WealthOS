'use server';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { sessionClient } from '@/lib/supabase/server';
import { bump, rateLimit, resetCounter } from '@/lib/rate-limit';
import { siteUrl } from '@/lib/env';

type Portal = 'staff' | 'customer';
export type Result = { ok?: boolean; error?: string; message?: string; code?: 'unconfirmed'; redirect?: string };

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12, 'Use at least 12 characters').max(72);
const GENERIC = 'Email or password is incorrect.';
const WINDOW = 15 * 60_000;

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12);
async function ip() { const h = await headers(); return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'; }
const audit = (actor: string | null, action: string, outcome: string, meta: Record<string, unknown> = {}) =>
  admin().from('audit_log').insert({ actor_id: actor, action, resource: 'auth', outcome, meta });

export async function signIn(portal: Portal, input: { email: string; password: string }): Promise<Result> {
  const p = z.object({ email, password: z.string().min(1).max(200) }).safeParse(input);
  if (!p.success) return { error: GENERIC };
  const who = hash(p.data.email);
  if (!rateLimit(`login-ip:${await ip()}`, 25, WINDOW) || !rateLimit(`login-id:${who}`, 8, WINDOW))
    return { error: 'Too many attempts. Please wait a few minutes and try again.' };

  const sb = await sessionClient();
  const { data, error } = await sb.auth.signInWithPassword(p.data);
  if (error?.code === 'email_not_confirmed') return { error: 'Please confirm your email first. Check your inbox (and spam folder) for our message.', code: 'unconfirmed' };
  if (error || !data.user) {
    await audit(null, 'login', 'denied', { portal, id: who });
    if (portal === 'staff' && bump(`login-fail:${who}`, WINDOW) >= 5)
      await admin().from('alerts').insert({ severity: 'warning', kind: 'failed_logins', message: 'Repeated failed sign-ins on the staff portal', source: who });
    return { error: GENERIC };
  }
  if (portal === 'staff') {
    const { data: s } = await admin().from('staff_members').select('status').eq('user_id', data.user.id).maybeSingle();
    if (!s || s.status !== 'active') {                                  // customers can never enter the staff portal
      await sb.auth.signOut();
      await audit(data.user.id, 'login', 'denied', { portal, reason: 'not_staff' });
      return { error: GENERIC };
    }
  }
  resetCounter(`login-fail:${who}`);
  await audit(data.user.id, 'login', 'success', { portal });
  return { ok: true };
}

export async function signUp(input: { email: string; password: string; full_name: string }): Promise<Result> {
  const p = z.object({ email, password, full_name: z.string().trim().min(1).max(120) }).safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!rateLimit(`signup-ip:${await ip()}`, 10, 60 * 60_000)) return { error: 'Too many sign-up attempts. Please try again later.' };
  const sb = await sessionClient();
  const { data } = await sb.auth.signUp({ email: p.data.email, password: p.data.password, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/account`, data: { full_name: p.data.full_name } } });
  if (data?.session) return { ok: true, redirect: '/account' };      // email confirmation is off: they are already signed in
  // Same answer whether or not the address already exists (prevents account enumeration).
  return { ok: true, message: 'Check your email to confirm your account.' };
}

export async function requestReset(portal: Portal, input: { email: string }): Promise<Result> {
  const p = z.object({ email }).safeParse(input);
  if (!p.success) return { error: 'Enter a valid email address.' };
  if (!rateLimit(`reset-ip:${await ip()}`, 8, 60 * 60_000) || !rateLimit(`reset-id:${hash(p.data.email)}`, 3, 60 * 60_000)) return { error: 'Too many requests. Please try again later.' };
  const next = portal === 'staff' ? '/command-center/reset' : '/account/reset';
  const sb = await sessionClient();
  await sb.auth.resetPasswordForEmail(p.data.email, { redirectTo: `${siteUrl()}/auth/callback?next=${next}` });
  await audit(null, 'password_reset_request', 'success', { portal, id: hash(p.data.email) });
  return { ok: true, message: 'If an account exists for that email, a reset link is on its way.' };
}

export async function updatePassword(input: { password: string }): Promise<Result> {
  const p = z.object({ password }).safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'This reset link has expired. Request a new one.' };
  const { error } = await sb.auth.updateUser({ password: p.data.password });
  if (error) return { error: 'Could not update the password. Try a different one.' };
  await sb.auth.signOut({ scope: 'others' });                           // end every other session
  await audit(user.id, 'password_change', 'success');
  return { ok: true, message: 'Password updated.' };
}

export async function signOutEverywhere(): Promise<void> {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  await sb.auth.signOut({ scope: 'global' });
  if (user) await audit(user.id, 'logout_all', 'success');
  redirect('/');
}
export async function signOutHere(): Promise<void> {
  const sb = await sessionClient(); await sb.auth.signOut(); redirect('/');
}

export async function resendConfirmation(input: { email: string }): Promise<Result> {
  const p = z.object({ email }).safeParse(input);
  if (!p.success) return { error: 'Enter a valid email address.' };
  if (!rateLimit(`resend-ip:${await ip()}`, 8, 60 * 60_000) || !rateLimit(`resend-id:${hash(p.data.email)}`, 3, 60 * 60_000)) return { error: 'Too many requests. Please try again in an hour.' };
  const sb = await sessionClient();
  await sb.auth.resend({ type: 'signup', email: p.data.email, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/account` } });
  return { ok: true, message: 'If that address needs confirming, we sent a new link.' };
}
