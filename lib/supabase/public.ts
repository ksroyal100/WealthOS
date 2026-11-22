import { createClient } from '@supabase/supabase-js';

// Anon client for the public site. RLS only lets it read rows marked published.
// A short timeout means a slow or unreachable database shows empty states instead of hanging the page.
export const publicClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000) }) },
  });
