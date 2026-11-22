import 'server-only';
import { z } from 'zod';

const server = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});
/** Fails fast with a clear message instead of an obscure runtime error. */
export function requireServerEnv() {
  const r = server.safeParse(process.env);
  if (!r.success) throw new Error('Missing or invalid server environment: ' + r.error.issues.map((i) => i.path.join('.')).join(', '));
  return r.data;
}
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
