# Supabase production setup (do this before launch)

Use a **separate production project**. Run every migration on a staging project first.

## Authentication
- Auth > Providers > Email: **Confirm email = ON**. Minimum password length **12**. Enable leaked-password protection if your plan has it.
- Auth > Multi-Factor: enable **TOTP**. Staff are forced to AAL2 in code; also enrol every staff member before first use.
- Auth > URL Configuration: Site URL = your production domain. Redirect URLs: `https://YOUR-DOMAIN/auth/callback`.
- Auth > Rate limits: keep defaults or tighten. Enable **CAPTCHA** (Cloudflare Turnstile) on sign-up and sign-in if you see abuse.
- JWT expiry: 3600 seconds. Turn on refresh-token reuse detection.
- Email templates: brand them; set up custom SMTP (Resend/Postmark) so mail leaves from your domain (SPF, DKIM, DMARC).

## Database
- Run `supabase/migrations/0001` to `0007` in order, then `supabase/tests/authz.sql` on STAGING.
- API > Exposed schemas: add `cc`. It stays locked: anon/authenticated have no grants; only `service_role` (server-only key) can use it.
- Never put the service-role key in any `NEXT_PUBLIC_` variable or client code.
- Settings > Database: enable **daily backups**; on a paid plan enable **Point-in-Time Recovery**. Restrict network access if available.
- Create the first staff row (see README), then add MFA.

## Private document storage (required for the Legal module)
- Migration 0007 creates a private bucket named `documents` (no public access, 10 MB limit) when Supabase Storage exists. Confirm it in Storage: it must show as **private** and have **no policies**.
- Do not add storage policies. Files are only reachable through the server, which checks permission, then issues a 60-second signed link and logs the download.
- Test it once on staging: upload a PDF in Command Center > Legal, download it, and confirm that a copy of the raw storage URL does not work without a signed token.

## Stripe (optional but recommended)
- Create a NEW webhook endpoint `https://YOUR-DOMAIN/api/webhooks/stripe` (your existing Finora endpoint is untouched).
- Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `customer.subscription.created|updated|deleted`.
- Put the signing secret in `STRIPE_WEBHOOK_SECRET`. Add `product_slug` (for example `finora`) to the **metadata** of each Price or Payment Link so revenue lands on the right product.
- Use Payment Links as each plan's checkout URL. The site appends the signed-in customer's id so purchases attach to their account.
- Stripe fees are not recorded automatically. Record them as `fee` entries, or extend the webhook with balance transactions.
- Only 2-decimal currencies are recorded automatically; others raise an alert instead of guessing.

## Vercel + GitHub
- Set every variable from `.env.example` in Vercel (Production only for secrets). Add `APP_URL` and `CRON_SECRET` as GitHub Actions secrets for the report and monitor schedules.
- Turn on branch protection: require the CI checks (app + database) before merging.
- Add your domain, force HTTPS, and enable Vercel Attack Challenge Mode if you are under attack.

## Monitoring
- Sentry DSN in `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. Uptime check on `/api/health`.
