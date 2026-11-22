# Security and operations runbook

## Controls implemented
- Staff access requires a `cc.staff_members` row with status `active`; being signed in is not enough.
- MFA (TOTP, AAL2) required for staff with `mfa_required` (default true).
- Authorization is checked server-side in every page, route handler and server action (`requirePermission`). Nav hiding is cosmetic.
- All `cc.*` tables: RLS enabled, no policies, no grants for anon/authenticated. Only the server-only service-role client reads them.
- Audit log is append-only (triggers + revoked privileges). Denied attempts, exports, approvals, invites and status changes are logged. No secrets are logged.
- Approvals: no self-approval, per-user amount limits, atomic decision + audit in one DB function.
- Money: `numeric(14,2)`, decimal strings in app code; estimated/pending/failed never count as received.
- Ingest: HMAC-SHA256 with timestamp (5 min replay window), strict zod schema, size cap, rate limit.
- CSV export neutralises formula injection. Security headers and CSP set in `next.config.ts`. Sentry strips cookies/headers/bodies.
- Banking is integration-ready only. Scope can only be `read_only`; the app has no code path that moves money.

## Added in the final build
- Server-side sign-in for both portals: per-IP and per-account rate limits, a generic error message, every attempt audited, repeated staff failures raise an alert. Customers can never enter the staff portal.
- Account enumeration protection on sign-up and password reset (same response either way). Passwords: 12+ characters.
- Password change ends all other sessions. "Sign out of all devices" for customers and staff. Deactivating staff revokes their sessions.
- Stripe webhook: signature verified (HMAC, 5-minute window), idempotent per event, rolled back for retry on failure. Customer billing tables are read-only to customers and row-isolated by RLS (tested).
- Same-origin check on cookie-authenticated API POSTs. Server Actions use Next.js built-in origin checks.
- Open-redirect protection on auth callback and `next` parameters. Article bodies render as plain text only (no HTML injection).
- Automated monitor (hourly) for stale data sources, overdue work and projects, stale approvals, revenue drops and unusual amounts.

## Known limits (be aware before production)
- Rate limiting and failed-login counters are in-memory per server instance. Behind multiple instances or serverless cold starts they are weaker; move them to Redis/Upstash before heavy traffic. Supabase Auth has its own limits as a second layer.
- Rate limiter is in-memory (per instance). Use Redis/Upstash if you run more than one instance.
- CSP allows `'unsafe-inline'` scripts for Next.js compatibility. Move to nonces when you can.
- Login has no custom lockout beyond Supabase Auth's own rate limits. Configure them in the Supabase dashboard.
- Email delivery needs RESEND_API_KEY + REPORT_FROM_EMAIL. Without them reports are generated and stored but not emailed.
- Customer subscriptions/purchases/billing are NOT connected; they depend on your existing tables.

## Secrets
Server-only: SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, INGEST_SECRET_*, RESEND_API_KEY. Never prefix with NEXT_PUBLIC_. Rotate on staff departure.

## Backup and recovery
1. Enable Supabase daily backups (and PITR on a paid plan).
2. Monthly: restore the latest backup into a scratch project and run `supabase/tests/authz.sql` plus a row-count check on `cc.ledger_entries` and `cc.audit_log`.
3. Before every migration: take a manual backup; run the migration on a staging branch first.
4. Incident: deactivate the staff member (this revokes sessions), rotate affected secrets, review `cc.audit_log`.

## Finora ingest contract
POST /api/ingest/metrics with headers `x-product: finora`, `x-timestamp: <ms>`, `x-signature: hex(HMAC_SHA256(INGEST_SECRET_FINORA, timestamp + "." + rawBody))`.
Body (aggregates only, no personal data): `{"day":"2026-01-31","total_users":0,"active_users":0,"new_registrations":0,"active_subscriptions":0,"cancellations":0,"mrr":"0.00","currency":"USD","health":"healthy"}`
