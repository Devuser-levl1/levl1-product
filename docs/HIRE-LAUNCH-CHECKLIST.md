# Levl1 Hire — Launch Checklist

Pilot-readiness checklist for onboarding the first agency customers.

## 1. Environment variables (Render)
- [ ] `DATABASE_URL` — Render PostgreSQL
- [ ] `JWT_SECRET` — 64-char secret (shared with Interviews)
- [ ] `ANTHROPIC_API_KEY` — AI resume scoring + question generation
- [ ] `RESEND_API_KEY`, `FROM_EMAIL` (noreply@mail.levl1.io)
- [ ] `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=TEST` (→ `PROD` at launch)
- [ ] `NEXT_PUBLIC_APP_URL=https://levl1.io`
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` (Interviews invites)
- [ ] `ADMIN_SECRET_TOKEN` (internal /admin)
- [ ] `CRON_SECRET` (reminder/cron protection)

## 2. Billing (Cashfree)
- [ ] Webhook registered: `https://levl1.io/api/hire/billing/webhook`
- [ ] TEST end-to-end: trial → upgrade → webhook → plan active
- [ ] Switch `CASHFREE_ENV` TEST → PROD before charging real customers

## 3. Email (Resend)
- [ ] Resend domain verified (per-agency white-label optional)
- [ ] `from` = `{agency} via Levl1 <noreply@mail.levl1.io>`, `replyTo` = recruiter
- [ ] Campaign unsubscribe link + tracking pixel working

## 4. Background jobs (pg-boss)
- [ ] pg-boss running on the Render web service (persistent process)
- [ ] Handlers registered on boot: `hire:score-candidate`, `hire:interview-reminder`, `hire:send-campaign`
- [ ] Jobs idempotent / survive restarts

## 5. Database
- [ ] All migrations applied to production (`prisma db push` in build)
- [ ] `prisma generate` runs in build (`npm run build`)
- [ ] Demo data wiped: `node scripts/clear-hire-seed.js`

## 6. Marketing site
- [ ] Live: `/`, `/hire`, `/interviews`, `/upword`, `/roadmap`, `/pricing`
- [ ] Per-page SEO titles + meta; nav + footer consistent
- [ ] DNS + Render custom domains in place

## 7. Quality & security
- [ ] Interviews 19-story regression pass
- [ ] Hire smoke test: signup → job → candidate → pipeline → interview → CRM → analytics → billing
- [ ] Tenant isolation verified (no cross-tenant reads on candidates, jobs, deals, campaigns)
- [ ] Public routes (apply, unsubscribe, tracking pixel) expose no tenant data
- [ ] Apply submissions rate-limited (per-IP)
- [ ] `withHireAuth` wraps every `/api/hire/*` route; all queries filter by `tenantId`

## 8. Operations
- [ ] /admin lists Hire tenants with plan/usage/trial; extend-trial + change-plan work
- [ ] Backup/export path for tenant data
- [ ] Support email (hello@levl1.io) + feedback path working

> Roadmap and pricing are indicative; confirm final numbers with the business plan before launch.
