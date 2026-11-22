import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { sessionClient } from '@/lib/supabase/server';

/** Every customer page and layout calls this itself. Pages never rely on a parent layout to keep anonymous visitors out. */
export const requireCustomer = cache(async () => {
  const sb = await sessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/account/login');
  return { sb, user };
});
