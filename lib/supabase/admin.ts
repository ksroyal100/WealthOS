import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { requireServerEnv } from '@/lib/env';

// Server-only. Never import from client components. The key must never use a NEXT_PUBLIC_ prefix.
export const admin = () => {
  const e = requireServerEnv();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: 'cc' } });
};
