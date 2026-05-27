# Levl1 — AI Interview Platform

> AI-powered L1 interviews for tech and product roles.  
> Built for recruitment agencies and enterprises.

🌐 **[levl1.app](https://levl1.app)**

---

## What is Levl1?

Levl1 conducts structured, AI-driven first-round (L1) interviews so your best candidates don't get lost to scheduling delays and panel availability. The platform handles voice-based screening, real-time evaluation, and ranked shortlists — end to end.

---

## Features

| Feature | Description |
|---|---|
| **AI Voice Interviews** | Structured L1 interviews via voice AI, available 24/7 |
| **Live Monitoring** | Recruiter dashboard with real-time transcript and per-question scores |
| **Code Editor** | In-browser Monaco editor (6 languages) for technical rounds |
| **Whiteboard** | Canvas-based drawing tool for system design questions |
| **Automated Scoring** | Per-section scores (Technical, Behavioral, Scenario, EQ) |
| **Position Reports** | AI-generated talent pool insights and candidate rankings |
| **Pipeline Management** | Kanban-style candidate pipeline per open role |

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State**: Zustand
- **UI**: Custom inline styles (no component library)
- **AI**: Anthropic Claude (claude-opus-4-7)
- **TTS**: ElevenLabs API (browser SpeechSynthesis fallback)
- **STT**: Web Speech API
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Monorepo**: Turborepo

---

## Project Structure

```
levl1product/
├── apps/
│   └── web/                  # Next.js 14 application
│       ├── app/
│       │   ├── page.tsx              # Landing page
│       │   ├── login/                # Auth page
│       │   ├── dashboard/            # Main app shell
│       │   └── interview/
│       │       └── [interviewId]/
│       │           ├── page.tsx      # Candidate interview room
│       │           └── monitor/      # Recruiter monitor
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── interview/
│       │   │   └── Whiteboard.tsx
│       │   ├── reports/
│       │   │   └── ReportsPage.tsx
│       │   ├── positions/
│       │   ├── candidates/
│       │   └── settings/
│       └── store/
│           └── appStore.ts           # Zustand global store
└── packages/                 # Shared packages (future)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install

```bash
git clone https://github.com/devuser-levl1/levl1product.git
cd levl1product
npm install
```

### Environment Variables

Create `apps/web/.env.local`:

```env
# Anthropic (required for AI features)
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs (optional — browser TTS used as fallback)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers all AI evaluation, question generation, and report summaries |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS for AI interviewer voice. Falls back to browser SpeechSynthesis |
| `ELEVENLABS_VOICE_ID` | No | Defaults to Rachel (`21m00Tcm4TlvDq8ikWAM`) |

---

## License

Private — all rights reserved © 2026 Levl1.
