import { NextResponse } from 'next/server';
import { sessionClient } from '@/lib/supabase/server';

const ALLOWED = new Set(['/account', '/account/reset', '/command-center/reset']);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';
  const dest = ALLOWED.has(next) ? next : '/account';                  // never redirect to arbitrary URLs
  if (code) {
    const sb = await sessionClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`${dest === '/command-center/reset' ? '/command-center/forgot' : '/account/forgot'}?expired=1`, url.origin));
  }
  return NextResponse.redirect(new URL(dest, url.origin));
}
