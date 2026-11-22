# WealthOS: status against the corporate operating system brief

This file is the honest status. "Verified" means a test I ran passed. "Built, not verified" means the code exists and compiles but has not been exercised in the real environment (a live Supabase project, a browser, Stripe).

## What was verified (and how)
| Gate | Result |
|---|---|
| Type check | passes |
| Unit, contrast and accessibility tests | 56 pass (axe on rendered pages; contrast read from the real stylesheet; document policy; CMS routing; error messages; KPIs; Stripe signatures) |
| Production build | passes, 39 static pages generated |
| HTTP smoke tests against the production server | 33 pass (26 public pages each have one h1, skip link, main landmark; staff portal and APIs closed to anonymous visitors; customer pages require sign-in; machine endpoints refuse unsigned calls; security headers; CSP has no eval; robots and sitemap) |
| Database tests on real Postgres 16 | 3 suites pass: authz (approvals, customers), corporate (structure, leadership verification, CMS workflow), governance (roles, overrides, multi-level approvals, FX, aging, HR, documents, incident alerts, support isolation) |
| Dependency audit | 0 known vulnerabilities, including dev dependencies |

## Requirement status
| Area | Status |
|---|---|
| 21 public pages and templates | Built and smoke-tested. Pages show honest empty states until content is published. |
| Corporate structure (divisions, departments, teams, subsidiaries; legal status never assumed) | Verified in the database; screen built, not verified in a browser |
| Leadership (verified, appointed, public only with a second person's verification) | Verified in the database; screen built, not verified in a browser |
| Corporate CMS (draft, review, approve, schedule, publish, unpublish, preview, revisions) | Workflow verified in the database; screens built, not verified in a browser. No revision restore or diff view yet. |
| RBAC: 13 roles, custom roles, overrides with expiry, role changes with history, no self-grant, no privilege escalation, last-CEO protection | Verified in the database |
| Department-scoped roles | Enforced by `has_permission_in_unit` (verified). **Gap:** the Command Center screens still check company-wide permission, so a role limited to one department does not yet unlock pages. Product-scoped checks are used by engineering and product screens. |
| Finance: ledger, invoices, budgets, vendors, AR and AP aging, multi-level approvals, limits, separation of duties | Verified in the database |
| Multi-currency: no combining without a documented rate | Verified (consolidation flags missing rates and never guesses) |
| Banking | Read-only placeholder. No bank connection exists and none is simulated. |
| HR: directory, positions, recruitment, onboarding, leave, sensitive fields behind their own permission | Rules verified; screens built, not verified in a browser. Employee documents use the Legal module. |
| CRM and partnerships, inquiries from the public form | Built; inquiry insert and isolation verified at the database level |
| Legal and documents: private storage, versions, download permission, short-lived links, audit, expiry alerts | Rules and policy verified. **Not verified against real Supabase Storage.** |
| Engineering: milestones tables, releases, deployments, incidents, technical docs, automatic alerts | Alert triggers verified; screens built. Milestones have tables but no screen yet. |
| Media and marketing: campaigns, editorial workflow through the CMS | Built, not verified in a browser |
| Reports: daily, weekly, monthly, annual, schedules, email, deadline and expiry reminders | Built; period logic unit-tested. **Department-specific reports are not built.** |
| Customer portal incl. support requests with strict isolation | Isolation verified in the database; pages smoke-tested |
| Security: rate-limited sign-in, MFA, session revocation, CSRF origin check, input validation, audit logging, private files, signed integrations | Built; the main controls verified by tests |

## Known gaps and honest limits
1. **Database-level authorization is not complete.** Sensitive tables are locked to the server's service-role key, and permission checks run in server code on every page and action. Key invariants (approvals, role administration, CMS, leave, documents) are enforced inside database functions, but routine reads and writes are not yet protected by per-user row-level policies. Moving finance, HR and legal reads to per-user access with RLS and an MFA-level check is the next security milestone.
2. **No browser has been run here.** The Playwright end-to-end specs (desktop, tablet, phone) are written and run in CI, but I have not executed them, and I have not seen the site rendered. Please run them and review the pages on real devices.
3. **Not tested against real services:** Supabase Auth emails, Supabase Storage, Stripe, email delivery. Do a staging run first.
4. **Editorial imagery and photos are not included.** The design supports them but no images were invented. Executive photos are not wired in yet.
5. **Rate limiting is in memory per server instance.** Use Redis or Upstash before heavy traffic. CSP still allows inline scripts for Next.js.
6. **Content must be supplied and verified by the company.** All public corporate copy comes from published CMS entries. The only fixed text is the positioning line and identity statement you provided, plus factual descriptions of the platform's own security features.
7. Legal pages are drafts for attorney review.

## What the company must provide
Legal status of WealthOS and any divisions; appointed executives and their consent to be shown; approved mission and vision; true partnership, press and investor information; real photography.
