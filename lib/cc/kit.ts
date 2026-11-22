import 'server-only';
import { ZodError } from 'zod';
import { admin } from '@/lib/supabase/admin';

export type State = { ok?: boolean; error?: string; message?: string; redirect?: string };
export const ok = (message = 'Saved.', redirect?: string): State => ({ ok: true, message, redirect });

/** Turns any failure into a short, human-readable message. Database rule violations (raise exception) are curated texts and are shown as-is. */
export function errMsg(e: unknown): string {
  if (e instanceof Response) return e.status === 403 ? 'You do not have permission to do this.' : 'The request failed.';
  if (e instanceof ZodError) return e.issues.slice(0, 2).map((i) => `${i.path.join('.') || 'form'}: ${i.message}`).join('; ');
  const x = e as { code?: string; message?: string };
  if (x?.code === '23505') return 'That already exists.';
  if (x?.code === '23514') return 'One of the values is not allowed.';
  if (x?.code === '23503') return 'A linked record is missing.';
  if (x?.code === '42501') return 'You do not have permission to do this.';
  if (x?.message && x.message.length < 220 && !/^[{<]/.test(x.message) && x.code !== '42P01') return x.message;
  return 'Something went wrong. Please try again.';
}

export async function run(fn: () => Promise<State>): Promise<State> {
  try { return await fn(); } catch (e) { return { error: errMsg(e) }; }
}

/** FormData -> plain object where empty strings become undefined (so optional zod fields work). */
export function clean(fd: FormData): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') o[k] = v.trim() === '' ? undefined : v.trim();
  return o;
}
export const checked = (fd: FormData, name: string) => fd.get(name) === 'on';

export function audit(actor: string | null, action: string, resource: string, record: string | null, outcome = 'success', meta: Record<string, unknown> = {}) {
  return admin().from('audit_log').insert({ actor_id: actor, action, resource, record_id: record, outcome, meta });
}
export function must<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) throw r.error;
  if (r.data == null) throw new Error('That record was not found.');
  return r.data as NonNullable<T>;
}
