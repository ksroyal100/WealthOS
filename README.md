# WealthOS: public website + private Command Center

Next.js 16, React 19, TypeScript, Tailwind, Supabase (Auth + Postgres), Zod, React Hook Form, TanStack Table, Recharts, Sentry.

Built as additive files for an existing repo. It was written without access to your repository, so run the audit steps below before merging.

## Install into your repo
1. Compare `package.json`, `proxy.ts`, `next.config.ts` and `app/layout.tsx` with yours and merge rather than overwrite.
2. `npm install`
3. Staging DB first: run every file in `supabase/migrations/` in order (0001 to 0007). Then follow `docs/SUPABASE_SETUP.md`.
   - 0002 creates `public.catalog_products`, `public.catalog_plans`, `public.publications`. Rename if those names exist.
4. Supabase > API > Exposed schemas: add `cc` (access remains service_role only).
5. Run `supabase/tests/authz.sql` on staging.
6. Create your staff row (see below), enrol MFA at /command-center/mfa.
7. Copy `.env.example` to `.env.local` and fill it; set the same secrets in Vercel and GitHub (APP_URL, CRON_SECRET).
8. `npm run typecheck && npm test`

## First staff account
    insert into cc.staff_members (user_id, full_name, designation, status) values ('<auth uid>', 'Your Name', 'Founder & CEO', 'active');
    insert into cc.staff_roles (user_id, role_id) select '<auth uid>', id from cc.roles where key='ceo';
    insert into cc.approval_limits values ('<cfo uid>', 'USD', 5000.00);   -- per-approver limits

## Map
- Public: `/`, `/about`, `/media`, `/tech`, `/marketplace`, `/marketplace/[slug]`; customers: `/account`
- Command Center: overview, finance, banking, approvals, products, media, projects, team, reports, audit log
- API: `/api/ingest/metrics` (signed), `/api/cron/reports` (bearer), `/api/cc/*` (session + permission)
- Details and limits: `docs/SECURITY.md`

## Adding a new product (finance, business, sales, real estate, anything)
1. Command Center > Products > Register a product (slug, name, category). A hidden draft listing is created automatically.
2. Set its status (Live, Beta, Coming soon) and tick Published. It then appears on the home page, marketplace and Tech page with no code change.
3. Add plans in `public.catalog_plans`, and have the product post signed metrics to `/api/ingest/metrics`.

`preview/wealthos-homepage.html` is a standalone preview of the front page.

## Before you launch to US customers (checklist)
- Set NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_CONTACT_EMAIL. Add your real logo, Finora screenshots and team/leadership content.
- Have a licensed attorney finish /privacy and /terms (every [bracket] is a decision for you), then set NEXT_PUBLIC_LEGAL_REVIEWED=true.
- If you add analytics or ads later, add a consent / opt-out mechanism first.
- Deploy to staging and run Lighthouse and an accessibility scan (axe), and test on real iPhone and Android devices.
- Review checkout wording for automatic-renewal and cancellation rules in the states you sell to.

## Design system
Apple-inspired: SF Pro on Apple devices (Inter elsewhere), black and white for premium, emerald-to-aqua accent for growth, blue glow for trust. Motion: aurora hero, scroll reveals, animated chart and progress ring, hover lifts. All motion stops for users with reduced-motion enabled. Regenerate the static preview with `npm run preview`.

## Design
Modern, Apple-inspired system: SF Pro on Apple devices (Inter elsewhere), frosted navigation, large confident type, full-width light and dark sections, rounded surfaces, emerald-to-aqua accents, and smooth scroll-reveal motion. All motion is disabled for visitors who prefer reduced motion. The public site, customer portal and Command Center share the same visual language. Contrast is checked from the real stylesheet by the test suite.

## Feature map
- **Public website (editorial design):** home, About, Mission and vision, Leadership, Corporate structure, Business divisions, WealthOS Technology, WealthOS Media (Financial Education, Business, Technology, Research), Marketplace and product pages, Pricing, Newsroom and press releases, Research, Careers, Partnerships, Investor and corporate information, Contact and business inquiries, Help center, Security and trust center, Privacy, Terms, Accessibility. Pages with nothing published show an honest empty state.
- **Customer portal:** overview, subscriptions, billing and orders, security (two-step verification, password), support requests (private threads), profile and privacy.
- **Command Center (grouped by department):** Corporate (structure, leadership, website content with review workflow); Finance (ledger, receivables and payables, invoices, budgets, vendors, multi-level approvals, currency and consolidation, banking placeholder); Product and engineering (products, projects, releases, deployments, incidents, technical docs); People (directory, recruitment, leave); Growth (companies, pipeline, partnerships, inquiries, campaigns, media); Legal (private documents with versions); Customers (support); Administration (access and team, reports, audit log).
- **Security and governance in the database:** permissions, scoped roles, overrides, role administration, multi-level approvals, content workflow, leave decisions, immutable audit and revision records.
- **Quality gates (all run in CI):** typecheck, 56 unit and accessibility tests, dependency audit (0 known vulnerabilities), production build, 33 HTTP smoke tests, database security tests, browser end-to-end tests.

See `docs/AUDIT_AND_ROADMAP.md` for the honest status of every requirement.
