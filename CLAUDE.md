# CLAUDE.md — Levl1 Platform

## Platform overview
Levl1 is a two-product recruitment platform for Indian staffing agencies and corporate HR teams,
built and owned by Abhijit Majumdar (Avyoma Labs).

### Products
| Product          | Route prefix | Purpose                           |
|------------------|--------------|-----------------------------------|
| Levl1 Interviews | /interviews  | AI voice interview + assessment   |
| Levl1 Hire       | /hire        | ATS pipeline + CRM + AI screening |

## Tech stack
- Frontend:    Next.js 14 (App Router), TailwindCSS
- Backend:     Next.js API routes
- Database:    PostgreSQL on Render, Prisma ORM
- AI:          Anthropic Claude via @anthropic-ai/sdk. Hire/shared features use
               `CLAUDE_MODEL` (lib/ai/model.ts). The live-interview BRAIN
               (evaluate-response, generate-dynamic-question) uses
               `INTERVIEW_MODEL` = claude-opus-4-8 (lib/screen/interview/model.ts).
- Voice:       ElevenLabs — TTS (eleven_turbo) AND STT (Scribe), single-vendor.
- Transcription: ElevenLabs Scribe v2 (Interviews product only).
               • LIVE: Scribe v2 Realtime over WebSocket. Browser captures 16 kHz
                 PCM and streams it; auth is a single-use token minted server-side
                 (/api/elevenlabs/stt-token → POST /v1/single-use-token/realtime_scribe,
                 reusing ELEVENLABS_API_KEY). VAD commit drives turn-taking; keyterm
                 prompting biases control/tech words. Falls back to Web Speech if the
                 token/mic fails. (Replaced Deepgram.)
               • FRAUD: Scribe v2 batch with diarization runs post-interview on the
                 recorded audio (/api/interview/fraud-diarize) to detect a second/
                 whispering voice → `second_voice` integrity events (review-only).
- Email:       Resend
- Auth:        JWT (access token), bcrypt — NO Google OAuth
- File storage: PostgreSQL text fields for MVP (no Cloudinary yet)
- Jobs:        pg-boss (background queues — AI scoring, email reminders)
- Billing:     Cashfree (both products)
- Hosting:     Render (web service + PostgreSQL)
- CI/CD:       GitHub → Render auto-deploy on push to main

## Monorepo structure
```
levl1/                       (repo root; the Next.js app lives in apps/web)
  app/
    (interviews)/            # Interviews product routes (existing)
    hire/                    # Hire product routes (new)
      page.tsx               # /hire landing
      (app)/                 # sidebar-wrapped Hire app (route group, no URL segment)
        dashboard/  jobs/  candidates/  pipeline/  crm/  analytics/  settings/
    api/
      interviews/            # Interviews API routes (existing)
      hire/                  # ALL Hire API routes (new)
  prisma/
    schema.prisma            # Single source of truth
  lib/
    hire/                    # Hire business logic (new)
      prompts.ts  ai.ts  email.ts  tenant-middleware.ts
      jobs/
    interviews/              # Interviews business logic (existing)
    shared/                  # Auth, email, AI client
  emails/
    hire/                    # Hire email templates (new)
    interviews/              # Interviews email templates (existing)
  components/
    hire/                    # Hire UI components (new)
    interviews/              # Interviews UI components (existing)
    ui/                      # Shared primitives
```

> NOTE: Hire app pages live under `app/hire/` (literal segment) so they serve
> `/hire/dashboard`, `/hire/jobs`, … . A `(hire)` route group would strip the
> segment and collide with the existing `/dashboard` route.

## Coding conventions
- TypeScript everywhere. No `any` types without a comment.
- Named exports only. No default exports except Next.js pages.
- Zod for all request validation at the API boundary.
- All DB queries go through Prisma — no raw SQL.
- Every Hire API route checks tenantId (from JWT) before querying.
- File naming: kebab-case for files, PascalCase for components.
- Hire models are prefixed with Hire in Prisma (HireJob, HireCandidate…).
- Environment variables: always read from process.env, never hardcode.

## Multi-tenancy (Hire product)
- Every Hire DB table has a tenantId column.
- Tenant middleware reads tenantId from JWT and attaches to request.
- All Hire queries MUST filter by tenantId — enforced in middleware.
- Tenant type: AGENCY (staffing firms) or CORPORATE (in-house HR teams).

## AI usage
- Model: claude-sonnet-4-20250514 for all AI features.
- Keep prompts in lib/hire/prompts.ts — never inline in route handlers.
- All AI calls are async and queued via pg-boss — never block the request.
- Return structured JSON from Claude using XML tags in the prompt.

## Key environment variables
```
DATABASE_URL         Render PostgreSQL connection string
ANTHROPIC_API_KEY    Claude API key
RESEND_API_KEY       Resend email API key
FROM_EMAIL           noreply@mail.levl1.io
JWT_SECRET           Access token secret (64 char random)
CASHFREE_APP_ID      Cashfree payments (both products)
CASHFREE_SECRET_KEY  Cashfree payments
CASHFREE_ENV         TEST or PROD
NEXT_PUBLIC_APP_URL  https://levl1.io
CRON_SECRET          Cron job auth secret
ELEVENLABS_API_KEY   Voice (Interviews only)
DEEPGRAM_API_KEY     Transcription (Interviews only)
```

## Integration between products
The two products are joined only via HireInterviewLink table:
  HireCandidate → HireInterviewLink → Interview (Interviews product)

A recruiter can trigger an Interviews session from a Hire candidate card.
The scorecard result syncs back to HireCandidate.interviewScore.
No other cross-product data sharing.
