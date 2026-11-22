'use server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { sessionClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { run, ok, clean, type State } from '@/lib/cc/kit';

async function ip() { const h = await headers(); return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'; }

/** Public business-inquiry form: validated, rate limited, with a honeypot field. Stored privately; nothing is echoed publicly. */
export async function submitInquiry(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    if (fd.get('website')) return ok('Thank you. We will be in touch.');                  // honeypot: bots fill hidden fields
    const v = z.object({ name: z.string().min(2, 'Enter your name').max(120), email: z.string().email('Enter a valid email'), topic: z.enum(['general', 'partnership', 'press', 'investor', 'careers', 'support']), message: z.string().min(10, 'Please write at least a sentence').max(4000) }).parse(clean(fd));
    if (!rateLimit(`inq:${await ip()}`, 5, 60 * 60_000)) throw new Error('Too many messages from this connection. Please try again later.');
    const db = admin();
    must2(await db.from('inquiries').insert(v));
    const { error } = await db.from('alerts').insert({ severity: 'info', kind: 'new_inquiry', message: 'New business inquiry received', source: 'contact' });
    if (error && error.code !== '23505') { /* the alert is a convenience; the inquiry is already saved */ }
    return ok('Thank you. Your message has been received and our team will reply by email.');
  });
}
function must2(r: { error: unknown }) { if (r.error) throw r.error; }

export async function createSupportRequest(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ subject: z.string().min(3).max(160), category: z.enum(['general', 'billing', 'account', 'technical', 'privacy']), body: z.string().min(5).max(4000) }).parse(clean(fd));
    const sb = await sessionClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Please sign in first.');
    if (!rateLimit(`sup:${user.id}`, 10, 60 * 60_000)) throw new Error('You have sent several requests recently. Please wait a little.');
    const { data: r, error } = await sb.from('support_requests').insert({ user_id: user.id, subject: v.subject, category: v.category }).select('id').single();   // RLS: only your own row
    if (error || !r) throw error ?? new Error('Could not create the request');
    const m = await sb.from('support_messages').insert({ request_id: r.id, author_user_id: user.id, body: v.body });
    if (m.error) throw m.error;
    return ok('Request sent. We will reply here.', `/account/support/${r.id}`);
  });
}
export async function customerReply(_: State, fd: FormData): Promise<State> {
  return run(async () => {
    const v = z.object({ request_id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(clean(fd));
    const sb = await sessionClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Please sign in first.');
    const { error } = await sb.from('support_messages').insert({ request_id: v.request_id, author_user_id: user.id, body: v.body });   // RLS refuses closed or foreign requests
    if (error) throw new Error('This request is closed or not yours. Open a new request instead.');
    return ok('Sent.');
  });
}
