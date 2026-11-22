'use client';
import { browserClient } from '@/lib/supabase/browser';

/** Opens a Stripe Payment Link tagged with the signed-in user so the webhook can attach the purchase to their account. */
export default function PlanButton({ href, slug }: { href: string; slug: string }) {
  return (
    <button className="btn solid" onClick={async () => {
      const { data: { user } } = await browserClient().auth.getUser();
      if (!user) { window.location.href = `/account/login?next=${encodeURIComponent(`/marketplace/${slug}`)}`; return; }
      const u = new URL(href); u.searchParams.set('client_reference_id', user.id); if (user.email) u.searchParams.set('prefilled_email', user.email);
      window.location.href = u.toString();
    }}>Choose plan</button>
  );
}
