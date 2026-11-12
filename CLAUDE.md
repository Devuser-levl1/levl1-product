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
- AI:          Anthropic Claude via @anthropic-ai/sdk. See "AI usage" for which
               model each feature uses.
- Voice:       ElevenLabs only (Interviews product) — TTS AND STT, one account.
               ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID are SHARED; each call's
               MODEL is its own env var, read at request time (switch on Render,
               no rebuild). Config: lib/screen/interview/voice-config.ts.
               The key is SERVER-ONLY — never a NEXT_PUBLIC_ copy.
               Pre-flight: GET /api/interview/voice-check[?latency=1] (admin).
- TTS:         ELEVENLABS_TTS_MODEL (default eleven_v4_turbo; A/B eleven_v4).
               • Room → POST /api/interview/generate-speech with a voice token
                 (x-voice-token, minted by /api/interview/voice-session, live
                 interviews only; recruiter previews use the session, ≤400 chars).
                 Per-interview char budget (VOICE_MAX_CHARS_PER_HOUR).
               • STREAMED raw PCM (ElevenLabs /stream, pcm_24000) played as it
                 arrives via Web Audio (lib/screen/interview/tts-stream.ts) — first
                 audio ~1s. Pronunciation map applied server-side (C# → "C sharp",
                 lib/screen/tech-terms.ts).
               • NO browser speechSynthesis fallback, ever: retry once → "voice
                 reconnecting" → line stays on screen. Failures go to /api/interview/
                 voice-event (logs + InterviewLiveState.voiceWarning → Control Room).
               • Optional delivery tags ([warmly]…) on v3/v4 models when
                 ELEVENLABS_TTS_AUDIO_TAGS=1 — voice-only, never in transcript/report.
- Transcription: ElevenLabs Scribe v3.
               • LIVE: ELEVENLABS_STT_MODEL (default scribe_v3_live) over WebSocket.
                 Browser streams 16 kHz PCM (lib/screen/interview/scribe-stt.ts);
                 auth is a single-use token from /api/elevenlabs/stt-token, which
                 also returns the model + endpointing config. Turn-taking:
                 ELEVENLABS_STT_COMMIT_STRATEGY (turn_prediction on v3, VAD backstop)
                 + a merge-on-resume grace so pauses don't cut answers. Keyterms from
                 the position's skills + tech glossary (Scribe limits: ≤50 terms,
                 ≤20 chars). Falls back to Web Speech on a Scribe failure — logged
                 as stt_error and flagged in the Control Room, never silent.
               • FRAUD: ELEVENLABS_STT_BATCH_MODEL (default scribe_v3) batch with
                 diarization runs post-interview on the recorded audio
                 (/api/interview/fraud-diarize) to detect a second/whispering voice
                 → `second_voice` integrity events (review-only).
               • No silent model fallback: rejected models log voice_model_rejected /
                 stt_model_rejected.
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
- Models (never hardcode a new one — use these constants):
  - Hire + shared features: `CLAUDE_MODEL` = claude-sonnet-4-5 (lib/ai/model.ts).
    (claude-sonnet-4-20250514 reached end-of-life on 2026-06-15 and returns 404.)
  - Screen live-interview brain (evaluate-response, generate-dynamic-question):
    `LIVE_INTERVIEW_MODEL` (alias `INTERVIEW_MODEL`) = claude-sonnet-4-6, fast so
    the candidate isn't kept waiting. Env override: SCREEN_LIVE_MODEL.
  - Screen final scoring / report / work-sample scoring / concept rubric:
    `SCORING_MODEL` = claude-opus-4-8. Env override: SCREEN_SCORING_MODEL.
    (Both in lib/screen/interview/model.ts.)
  - Known drift: some Screen routes still hardcode ids — extract-resume,
    generate-candidate-summary, generate-more-questions, generate-position-summary
    (claude-sonnet-4-6) and positions/parse-jd (claude-opus-4-7).
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
ELEVENLABS_API_KEY   Voice TTS + STT (Interviews only) — server-side only
ELEVENLABS_VOICE_ID  Shared fallback voice (built-in default: Ananya f0JpDwzbGK384Dd1WH2s)
ELEVENLABS_TTS_MODEL           eleven_v4_turbo (A/B: eleven_v4)
ELEVENLABS_STT_MODEL           scribe_v3_live
ELEVENLABS_STT_BATCH_MODEL     scribe_v3 (fraud diarization)
ELEVENLABS_STT_COMMIT_STRATEGY turn_prediction | vad
ELEVENLABS_STT_VAD_SILENCE_SECS / ELEVENLABS_STT_COMMIT_GRACE_MS   endpointing overrides (1.4 / 900)
ELEVENLABS_TTS_AUDIO_TAGS      1 = allow light delivery tags (default off)
VOICE_TOKEN_SECRET   Signs interview voice tokens (falls back to JWT_SECRET)
JUDGE0_API_KEY       Judge0 CE via RapidAPI (X-RapidAPI-Key) — server-only, never NEXT_PUBLIC_
JUDGE0_API_HOST      judge0-ce.p.rapidapi.com (X-RapidAPI-Host)
```

## Integration between products
The two products are joined only via HireInterviewLink table:
  HireCandidate → HireInterviewLink → Interview (Interviews product)

A recruiter can trigger an Interviews session from a Hire candidate card.
The scorecard result syncs back to HireCandidate.interviewScore.
No other cross-product data sharing.
