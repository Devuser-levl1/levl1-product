# Levl1 website restructure: Phase A audit and plan

Status: **waiting for approval.** No product code has been changed. This file is the only change in Phase A.
Scope: `apps/web` (Next.js 14 App Router). There is no `src/` directory: the `@/*` alias maps to the `apps/web` root. So "src/config" and "src/content" from the brief become `apps/web/config/` and `apps/web/content/`.

---

## 1. Route inventory

### (a) Marketing / public pages (all already in the `app/(marketing)` group, plus one outside it)

| URL | File | Content source | Notes |
|---|---|---|---|
| `/` | `app/(marketing)/page.tsx` | Hardcoded, `'use client'`, framer-motion | Old ATS-first story ("Recruiting runs on guesswork…") |
| `/interviews` | `app/(marketing)/interviews/page.tsx` | Hardcoded + `<DemoGallery/>` (`components/screen/demo/DemoGallery.tsx`) | **The demo gallery.** Also the old Interviews product page. Says "18-minute" and "A fraction of the cost of a human first-round" |
| `/hirepilot` | `app/(marketing)/hirepilot/page.tsx` | Hardcoded "doorway" chooser | |
| `/hirepilot/agencies` | `app/(marketing)/hirepilot/agencies/page.tsx` | Hardcoded + `components/marketing/hp.tsx`, `mocks/hirepilot.tsx` | |
| `/hirepilot/enterprise` | `app/(marketing)/hirepilot/enterprise/page.tsx` | Hardcoded | |
| `/pricing` | `app/(marketing)/pricing/page.tsx` → `components/marketing/pricing-client.tsx` + `pricing-faq.tsx` | Hardcoded tiers (already "Contact for pricing") | Tier names differ from the brief. FAQ claims "live the same day" and "enterprise data residency available" (unverified) |
| `/security` | `app/(marketing)/security/page.tsx` | Hardcoded | Has "GDPR-aligned" and "Working toward SOC 2" cards: **remove** |
| `/roadmap` | `app/(marketing)/roadmap/page.tsx` | Hardcoded | Lists planned/unbuilt products: **conflicts with content rule 1** |
| `/contact` | `app/(marketing)/contact/page.tsx` | Client form → `POST /api/demo` | The current "Book a demo" target everywhere |
| `/demo` | `app/(marketing)/demo/page.tsx` | `redirect('/interviews')` (a 307, not a 301) | Will become the new demo form |
| `/privacy`, `/terms`, `/cookies` | `app/(marketing)/*/page.tsx` → `components/marketing/legal.tsx` | Hardcoded | **No legal entity named anywhere.** Contact is hello@levl1.io |
| `/hire` | `app/hire/page.tsx` (**outside** the marketing group, inside the product segment) | Hardcoded; imports MarketingNav/Footer directly | A second HirePilot landing. The logo on `/hire/login` links to it. See §4 decision D1 |

Shared marketing components: `components/marketing/{nav,footer,ui,tokens,logo,hp,legal,cookie-banner,pricing-client,pricing-faq}.tsx`, `components/marketing/mocks/{index,hirepilot}.tsx`.
Layout: `app/(marketing)/layout.tsx` (an inline `<style>` CSS block, nav, footer, cookie banner).
There is **no** `sitemap.ts` or `robots.ts` today. The root `app/layout.tsx` sets `metadataBase` (from `NEXT_PUBLIC_APP_URL`, falling back to `https://levl1.io`) and provides static `opengraph-image.png` and `twitter-image.png`.

### (b) Product / app routes (must not move, rename, or change)

- **Interviews product:** `/dashboard`, `/positions/[id]`, `/reports/[positionId]`, `/report/[interviewId]`, `/settings`, `/settings/{account,developers,integrations}`, `/onboarding`, `/signup`, `/interviews/login`, `/forgot-password`, `/reset-password`, `/reset-password/[token]`, `/accept-invite/[token]`
- **Live interview room:** `/interview/[interviewId]`, `/interview/[interviewId]/monitor`
- **Candidate flows:** `/candidate/interview/[token]`, `/candidate/interview/[token]/complete`, `/candidate/join/[interviewId]`, `/candidate/schedule/[interviewId]`, `/candidate/complete/[interviewId]`, `/candidate/error`, `/schedule/[interviewId]`
- **Approvals (emailed):** `/approve/[token]`, `/approve/jd/[token]`, `/approve/rubric/[token]`
- **Hire product:** `/hire/(app)/*` (agent, analytics, campaigns, candidates, crm, crm/ar, crm/clients/[id], dashboard, help, inbox, interviews, jobs, jobs/new, jobs/[id], nurture, pipeline, settings/*, sourcing, talent-pool, team), `/hire/login`, `/hire/signup`, `/hire/onboarding`, `/hire/forgot-password`, `/hire/accept`, `/hire/accept-invite/[token]`, `/hire/apply/[slug]`, `/hire/unsubscribe/[token]`
- **Career pages:** `/careers/[slug]`
- **Platform/admin:** `/platform`, `/platform/{clients,usage}`, `/admin`, `/admin/{login,hire,interviews,demo-leads,agencies/[id]}`
- **API:** all 241 `app/api/**/route.ts` (including `/api/demo`, `/api/demo/start`, `/api/v1/*`, `/api/mcp`, webhooks, crons)
- **Next.js config behaviour to keep as is:** the `interview.levl1.io/*` → `/candidate/*` rewrite, the legacy `interview.levl1.app/:token` rewrites, the `/login` → `/interviews/login` 308, and the `/sw.js` and `/manifest.json` headers. `middleware.ts` matches `/admin/*` only.

### (c) Demo routes
- `/interviews`: the gallery page (marketing group). The **route stays.**
- `/api/demo/start` → creates an `isDemo` interview → `/interview/[id]?demo=1` (product room). `/api/demo/cleanup` handles cleanup. Personas are in `lib/screen/demo/personas.ts`.
- `components/interviews/DemoSalesCTA.tsx` (shown in the demo report) links to `/contact`.

---

## 2. Inbound-link risks (all stay unchanged)

None of these touches a marketing URL that changes. They are listed so they can be retested after Phase B.

| Source | Links it generates | Files |
|---|---|---|
| Interview invite email + WhatsApp | `/interview/[id]`, `/schedule/[id]` | `app/api/send-invite`, `app/api/whatsapp/webhook`, `lib/interviews/public-trigger.ts` |
| Reminders / reschedule / cancel / confirm | `/interview/[id]` | `app/api/cron/send-reminders`, `app/api/schedule/[id]/{cancel,confirm,reschedule}` |
| Candidate token links | `/candidate/interview/[token]` (+ the `interview.levl1.io` host rewrite) | `app/api/interview-token`, `app/api/schedule-confirm` |
| Consent + scheduling UI | `/candidate/schedule/[id]`, `/candidate/interview/[token]` | `ScheduleClient.tsx`, candidate interview page |
| Approvals | `/approve/*`, `/positions/[id]` | `app/api/positions/[id]/send-*`, `app/api/approve/[token]` |
| Reports | `/report/[id]` | `app/api/generate-report`, `app/api/v1/interviews/[id]/report` |
| Auth emails | `/reset-password[/token]`, `/accept-invite/[token]`, `/hire/accept-invite/[token]` | `app/api/auth/forgot-password`, `app/api/hire/auth/{forgot-password,invite}`, `app/api/hire/team/[id]/invite-link`, `app/api/agency/*`, `app/api/platform/leads/[id]/provision` |
| Hire emails (Resend) | `/hire/candidates`, `/hire/jobs/[id]`, `/hire/settings/billing`, `/hire/unsubscribe/[token]`, `/api/hire/campaigns/track/*`, `/api/hire/nurture/respond` | `lib/hire/email.ts`, `emails/hire/*`, `lib/hire/jobs/send-campaign.ts`, `lib/hire/nurture.ts`, `lib/hire/ar.ts` |
| Job-board / career output | `/hire/apply/[slug]`, `/careers/[slug]` | `lib/hire/boards/post.ts`, `lib/jobboards/distribute.ts`, `app/api/hire/jobs/[id]/distribution`, career-page settings |
| Webhooks (inbound) | `/api/payments/webhook`, `/api/hire/billing/webhook`, `/api/whatsapp/webhook`, `/api/hire/whatsapp/inbound` | unchanged |
| Outbound webhooks / API / MCP | `/api/v1/*`, `/api/mcp` | unchanged |
| **Product code → marketing URLs** | `/contact` from `app/hire/(app)/layout.tsx:211` ("Add Levl1 Interviews"), `components/screen/demo/DemoGallery.tsx:80`, `components/interviews/DemoSalesCTA.tsx:15`, `app/hire/page.tsx`; `/pricing` from `app/hire/page.tsx`; `/hire` from `app/hire/login/page.tsx:70`; `/interviews` from `app/interviews/login/page.tsx:52`; `/` from `app/signup/page.tsx:67` | Handled by redirects. **No product file is edited** |

No email, WhatsApp or webhook links to `/contact`, `/hirepilot*`, `/roadmap`, `/pricing`, `/security`, `/privacy` or `/terms`.

Side note, out of scope and not to be touched: 16 API routes fall back to `https://levl1.app` when `NEXT_PUBLIC_APP_URL` is unset. That is fine in production because the env var is set. I can flag it as a separate task.

---

## 3. New route map and collisions

| New URL | Status | Collision / action |
|---|---|---|
| `/` | Rewrite in place | Same file; new content |
| `/products/ai-interview` | New | None |
| `/products/hirepilot` | New | None |
| `/features/integrity` | New | None |
| `/features/hirematch` | New | None |
| `/features/integrations` | New | None. **Not** related to product `/settings/integrations` or `/hire/settings/integrations` |
| `/solutions/agencies` | New | None |
| `/solutions/enterprise` | New | None |
| `/services/interview-as-a-service` | New | None |
| `/services/custom-assessments` | New | None |
| `/pricing` | Rewrite in place | Same URL |
| `/security` | Rewrite in place | Same URL |
| `/demo` | **Collision:** currently `redirect('/interviews')` | Replace the redirect page with the demo form page. Anyone with an old `/demo` link now gets the form, and the form links to the gallery |
| `/interviews` | Keep the route | Same file; refocused as the "Try a demo interview" page (see D2). `/interviews/login` is unaffected |
| `/privacy`, `/terms` | Restyle in place | Add Avdima Technologies Pvt Ltd as the contracting entity and data controller |
| `/cookies` | Keep and restyle | Not in the route map, but the cookie banner links to it. Kept, plus a footer link |
| `/sitemap.xml`, `/robots.txt` | New (`app/sitemap.ts`, `app/robots.ts`) | None. `robots` disallows `/api/`, `/hire/`, `/admin`, `/platform`, `/dashboard`, `/candidate/`, `/interview/`, `/report/`, `/reports/`, `/approve/`, `/schedule/`, `/positions/`, `/settings` |

### 301 redirects (old marketing URLs only; added to `next.config.mjs` `redirects()` with `permanent: true`)

Next.js `permanent: true` sends a **308**. Search engines treat 308 like 301, and the existing `/login` redirect already uses it. If you specifically need a literal 301, I'll use `statusCode: 301` instead. Tell me which.

| From | To |
|---|---|
| `/hirepilot` | `/products/hirepilot` |
| `/hirepilot/agencies` | `/solutions/agencies` |
| `/hirepilot/enterprise` | `/solutions/enterprise` |
| `/contact` | `/demo` |
| `/roadmap` | `/products/ai-interview` (see D3) |
| `/hire` (exact match only, see D1) | `/products/hirepilot` |

Next.js redirect sources match exactly, so `/hire` does **not** catch `/hire/login`, `/hire/apply/*` and so on. Phase B tests that explicitly.

---

## 4. Decisions I need from you

**D1. The `/hire` landing page.** It sits in the product segment but is pure marketing copy (old, says "copilot"). **Recommendation:** add an exact-match `/hire` → `/products/hirepilot` redirect and leave `app/hire/page.tsx` untouched (the redirect fires before the page renders). No file under `app/hire/` is edited. The alternative is to leave `/hire` live with stale copy.

**D2. `/interviews` content.** Its product story moves to `/products/ai-interview`. **Recommendation:** same route, rebuilt as a focused "Try a demo interview" page: short hero, the existing `<DemoGallery/>` unchanged, then a link to the product page. I'd drop the ROI cards ("fraction of the cost" breaks rule 3).

**D3. `/roadmap`.** Its content lists unbuilt products, which rule 1 forbids. **Recommendation:** delete the page and redirect it to `/products/ai-interview`.

**D4. Self-serve trial for HirePilot.** The nav currently shows "Start free" → `/hire/signup` on `/hire*` pages, and the 21-day trial is a live funnel. **Recommendation:** keep a secondary "Start a free trial" link on `/products/hirepilot` and the HirePilot pricing tab, with "Book a demo" as the primary CTA. Say no if you want demo-only.

**D5. Interview length.** The brief says "~20 minutes". The production default is **18** (`lib/screen/session/duration.ts`, which can be overridden by env). "~20 minutes" is a fair rounding, so I'll put `INTERVIEW_LENGTH_LABEL = '~20 minutes'` in `config/site.ts`. Confirm, or I'll use "~18 minutes".

**D6. "Writes results back to any ATS": an honest wording.** What the repo actually does:
- **Read in:** Greenhouse (Harvest API, implemented), HirePilot (native). Lever and Salesforce are scaffolds that throw "coming soon", so I will **not** list them.
- **Write back:** native write-back to HirePilot (`HireInterviewLink` → `HireCandidate.interviewScore`). For every other ATS, the write-back path is **outbound webhooks** (`interview.completed`, `report.ready`) plus the **REST API `/api/v1`** (interviews, reports, candidates, jobs) and an **MCP endpoint**. The Greenhouse connector does not write back to Greenhouse today.

**Proposed copy:** "Works with any ATS. Pull roles and candidates in through a connector or our API. Results flow back through webhooks and the REST API, or natively into HirePilot." Integrations page list: HirePilot (native, two-way), Greenhouse (import), Webhooks, REST API, MCP. Then: "Need a specific ATS? We build connectors with design partners. Talk to us." Approve, or tell me what else is true.

**D7. Demo form "I'm hiring for" field.** `DemoRequest` has no column for it. **Recommendation:** no schema change. Add `hiringFor` to the `/api/demo` Zod schema and record it in the stored `message` and in the notification email. `/admin/demo-leads` keeps working. The notification goes to `hello@levl1.io`, which is hardcoded today; I'll read `DEMO_LEADS_TO_EMAIL` with `hello@levl1.io` as the fallback and add a TODO. Note: this edits one API route (`app/api/demo/route.ts`). It is additive, the existing `/contact`-style payload still validates, and nothing else calls it. OK?

**D8. Integrity wording.** The repo detects `multiple_faces`, `no_face`, `gaze_away`, `object_in_frame`, `tab_switch`, `window_blur`, `fullscreen_exit`, `screen_share_drop`, `paste_anomaly`, `latency_anomaly`, `ai_assisted_answer`, `combined_anomaly`, `reading_gaze`, `read_aloud_cadence` and `second_voice` (post-interview diarization). Overlay assistants are **inferred** from corroborating signals (reading-gaze saccades, read-aloud cadence, latency, answer patterns). The product does not detect a specific app. So the copy will say "flags behaviour consistent with overlay assistants and unauthorized tools", not "detects overlay apps". Approve?

---

## 5. Verified facts for copy (what I'll claim, and where it lives in the code)

**AI Interview:** adaptive spoken Q&A with follow-ups (`lib/screen/interview/*`); live coding (Monaco) plus whiteboard; culture-fit Likert segment (`lib/screen/session/culture-fit.ts`); consent by email and WhatsApp plus self-scheduling (`/candidate/schedule`, Twilio WhatsApp); automatic interface tour (`app/interview/[id]/page.tsx` auto-tour); evidence-based report with transcript, code and per-dimension reasons; integrity events stored separately and reviewed by a human, never auto-rejected; human-approved question banks (`/approve/*`).

**HirePilot** (each item checked in the code):
- AI JD generator + weighted rubric (`/api/generate-jd`, rubric approval)
- Résumé parsing incl. scanned/image PDFs (`lib/shared/file-parsing.ts`)
- HireMatch (`lib/hire/ai-matching.ts`)
- Pipeline (`/hire/pipeline`)
- Lev agent with approval proposals (`lib/hire/agent.ts`, agent substrate)
- Unified inbox with email (IMAP mailbox) + WhatsApp (`/hire/inbox`, `/api/hire/mailbox`, `/api/hire/whatsapp`)
- Send-to-client (`components/hire/submit-to-client-modal.tsx`)
- AR nudges (`lib/hire/ar.ts`)
- Nurture (`lib/hire/nurture.ts`)
- Team + performance leaderboard (`/hire/team`, `/api/hire/leaderboard`)
- Career pages (`/careers/[slug]`)
- One-click posting to **your own** Naukri/LinkedIn/Indeed accounts (`lib/hire/boards/*`). Worded as "bring your own board account". Per project notes, live board-API access is still pending, so I won't claim "posts to every board".

**Security page facts:** HTTPS/TLS in transit; tenant isolation (every Hire query is tenant-scoped); RBAC (`permissions.ts`) plus audit log (`/hire/settings/audit`); candidate consent capture; secrets encrypted with AES-256-GCM (mailbox and board credentials); subprocessors Anthropic, ElevenLabs (voice + transcription), Resend, Twilio (WhatsApp), Cashfree, Render.
**Shown as TODOs, not claims:** encryption at rest (it's a Render-managed Postgres feature; please confirm before I state it), the data retention policy (none defined in code), "candidate data not used to train models" (confirm against provider terms), data residency, SSO/SAML (I found no SSO for customers, so it's removed from the pricing Enterprise card).

---

## 6. Components: reuse vs. create

**Reuse (refactored lightly):** `logo.tsx`, `tokens.ts` (extended, not changed), `Reveal`/`Stagger`/`Container`/`GradientText`/`Eyebrow` from `ui.tsx`, `legal.tsx`, `cookie-banner.tsx`, `DemoGallery` (as-is, untouched), `ContactHelpdesk` (footer).
**Reuse after cleanup (mocks):** `ScorecardMock`, `KanbanMock`, `ApprovalMock`, `VerificationMock`, `mocks/hirepilot.tsx` (JD/rubric, inbox, Lev, AR, nurture, team, submit sheet). **Must strip:** the fake "SOC 2 Type II" / "ISO 27001" badges (`mocks/hirepilot.tsx:237`), the ₹ amounts (`:149`) and the `$24k` deal values (`mocks/index.tsx:128`) → neutral placeholders.
**Rebuild:** `InterviewRoomMock` → `InterviewRoomMock` in the locked layout (question bar on top; AI video above candidate video on the left; code/whiteboard tabs plus live transcript on the right).
**Create:** `components/marketing/sections/` → `Hero`, `ProblemGrid`, `Steps`, `FeatureGrid`, `SplitFeature`, `CTABand`, `FAQ`, `PricingTable`, `LogoBandPlaceholder` (renders nothing, holds the TODO), `ATSBand`, `IntegrityBand`, `ProductCard`; `components/marketing/nav/` → `MegaMenu` (keyboard: Enter/Space/Esc/arrow keys, focus trap in the mobile drawer), `MobileDrawer`; `components/marketing/motion/` → `GradientMesh` (CSS-only), `Reveal` (IntersectionObserver plus CSS, no framer on first paint).
**Delete after migration:** `app/(marketing)/hirepilot/**`, `app/(marketing)/roadmap`, `app/(marketing)/contact`, `components/marketing/{hp,pricing-client,pricing-faq}.tsx` (replaced).

**Content and config (typed, so copy edits need no layout changes):**
- `config/site.ts`: URLs, entity name, nav and footer, `INTERVIEW_LENGTH_LABEL`
- `config/pricing.ts`: HirePilot Launch/Scale/Enterprise; AI Interview PAYG packs/Volume; `price?: string` left empty, rendering "Contact for pricing"
- `content/{home,ai-interview,hirepilot,integrity,hirematch,integrations,agencies,enterprise,iaas,custom-assessments,security,pricing-faq,demo}.ts`
- `lib/marketing/metadata.ts`: a `pageMetadata({ title, description, path })` helper that sets the title, description, canonical (`https://levl1.io` + path), OpenGraph and Twitter tags
- OG images: a shared `app/(marketing)/opengraph-image.tsx`-style template via `next/og`, one per route segment, with the page title rendered on the brand gradient

---

## 7. Performance and accessibility approach
- Pages are **server components**. Only the nav, FAQ accordion, pricing tabs, demo form and gallery are client islands. Today `/` is entirely `'use client'` with heavy framer-motion, which is the main Lighthouse risk.
- Scroll reveals use CSS plus one small IntersectionObserver. Gradient meshes are CSS (no canvas, no `three`). Everything respects `prefers-reduced-motion`. Space is reserved up front so nothing shifts layout.
- The marketing layout exports its own `viewport` without `maximumScale: 1` / `userScalable: false`. The root sets those, and Lighthouse fails accessibility for them. A nested `viewport` overrides the root for marketing pages only, so product pages are unchanged.
- Known limit: the root layout loads the Cashfree SDK script on every page (async). I won't touch the root. If it costs points, I'll report the number and propose moving it into product layouts as a separate change.
- New styles use Tailwind with an **additive** `mk-*` colour namespace in `tailwind.config.ts`, plus the existing `T` tokens. No existing class changes.

---

## 8. Phase B test plan (I'll run this and report results)
1. `next build` passes; `tsc` is clean.
2. Every route in §3 returns 200 with the correct `<title>`, canonical and `og:image`. `sitemap.xml` lists them; `robots.txt` is valid.
3. Each redirect in §3 returns 308 (or 301) to the right target. Spot checks confirm the exact-match boundary: `/hire/login`, `/hire/signup`, `/hire/apply/<slug>`, `/hire/dashboard` (→ auth redirect as today) and `/interviews/login` still return 200.
4. Product smoke test (status code plus render, no auth changes): `/interviews/login`, `/hire/login`, `/signup`, `/hire/signup`, `/forgot-password`, `/reset-password`, `/careers/<real slug>`, `/candidate/error`, `/admin/login`. Webhook routes reject a bad-signature POST exactly as before (same status as on `main`).
5. Demo flow: `/interviews` gallery → `/api/demo/start` → `/interview/[id]?demo=1` loads. `/demo` form → `/api/demo` → row in `/admin/demo-leads`.
6. `git diff --stat main` shows **no** changes under `app/hire/`, `app/api/` (except `app/api/demo/route.ts` if D7 is approved), `app/candidate/`, `app/interview/`, `lib/` (except `lib/marketing/`) or `emails/`.
7. Greps over marketing code return zero hits for: copilot, take-home, chakra, agentic interview, online test, coming soon, Upword, school, student, Avyoma, MedOrbit, ₹, `$` followed by a digit, "per month", "/mo", SOC 2, ISO 27001, GDPR certified. Footer and legal pages name Avdima Technologies Pvt Ltd.
8. Lighthouse (mobile, production build) for `/`, `/products/ai-interview`, `/products/hirepilot`, with scores reported.

## 9. TODO placeholders that will exist after Phase B (all render nothing)
- Customer logos and testimonials (home, both product pages, agencies, enterprise)
- Any outcome metrics
- Security: encryption at rest, retention policy, model training, data residency
- Demo leads destination env var (`DEMO_LEADS_TO_EMAIL`)
- Real product screenshots to replace the recreated mocks, if you want them

---

## 10. Approved decisions (2026-10-07), which override the sections above where they differ
- **D1:** `/hire` → `/products/hirepilot` (exact match); `app/hire/page.tsx` left untouched.
- **D2:** the AI Interview product is renamed **Screen** ("Levl1 Screen") across the marketing site. Product page: `/products/screen` (replaces `/products/ai-interview`). Demo gallery: `/products/screen/demo` (gallery component unchanged). `/interviews` (exact match) → `/products/screen/demo`; `/interviews/login` is unaffected. Product-app UI labels are not renamed (out of scope: no product code edits).
- **D3:** `/roadmap` deleted → redirected to `/products/screen`.
- **D4:** secondary "Start a free trial" (`/hire/signup`) on the HirePilot product page and the HirePilot pricing tab.
- **D5:** the site says "~20 minutes" (covers the product tour); kept in `config/site.ts`.
- **D6:** **no ATS / integration messaging anywhere**, including no Screen ↔ HirePilot integration. `/features/integrations` is dropped from the route map, nav, footer and sitemap. The two products are presented as separate.
- **D7:** approved: `hiringFor` goes into `message`, and the recipient comes from `DEMO_LEADS_TO_EMAIL` (fallback hello@levl1.io). Zod is not installed in the repo, so validation is done by hand in the route's existing style rather than adding a dependency.
- **D8:** approved: "flags behaviour consistent with…" wording.
- **Redirect status:** literal **301** (`statusCode: 301`), matching the brief.

---

## 11. Phase B results (2026-10-07, branch `feat/website-restructure`)

**Follow-up approved and done:** fonts are self-hosted via `@fontsource` (same family names, so product pages are unchanged), and **Cashfree is removed entirely** (see the PR description for the billing implications).

**Lighthouse** (mobile preset, local production build, median of 3 runs):

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 91 | 100 | 100 | 100 | 3.4 s | 41 ms | 0.001 |
| `/products/screen` | 90 | 100 | 100 | 100 | 3.5 s | 36 ms | 0.019 |
| `/products/hirepilot` | 95 | 100 | 100 | 100 | 2.8 s | 19 ms | 0.014 |

**Still TODO, rendering nothing until confirmed:** customer proof slots (home, screen, hirepilot, agencies, enterprise); security facts for encryption at rest, a retention policy, model training and data residency; the `DEMO_LEADS_TO_EMAIL` env var on Render; real screenshots to replace the recreated mockups (optional); an enterprise billing flow (`lib/shared/request-upgrade.ts`).
