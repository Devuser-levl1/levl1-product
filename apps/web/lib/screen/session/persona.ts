// ── Interviewer persona + live session context (Screen-scoped, Build 03) ───
// THE home for the warm-up persona — tune the opener / transition / guardrails
// here. Isomorphic: buildSessionContext runs client-side so day/time reflect the
// CANDIDATE's real local timezone, dynamically per session (never a static
// string). Voice-only interviewer; enterprise-professional; neutral employer
// framing (no hardcoded org name leaks into the persona).

import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

export interface SessionContext {
  dayOfWeek: string   // e.g. "Wednesday"
  partOfDay: string   // "morning" | "afternoon" | "evening"
  timeStr: string     // localized clock time
  dateStr: string     // "Wednesday, June 17"
  timezone: string
}

// Live per-session — pass `now`/`tz` to test; defaults read the runtime clock +
// the browser's resolved timezone (the candidate's own when run client-side).
export function buildSessionContext(now: Date = new Date(), tz?: string): SessionContext {
  const timezone = tz || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC')
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone })
  const hour = Number(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).replace(/[^0-9]/g, '')) || 0
  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone })
  return { dayOfWeek, partOfDay, timeStr, dateStr, timezone }
}

// Beat 1 — name greeting + day/time-correct opener. Neutral employer framing:
// reference the configured org only if present, else stay role-neutral.
export function buildOpener({ firstName, ctx, role, orgName }: { firstName: string; ctx: SessionContext; role: string; orgName?: string | null }): string {
  const who = orgName && orgName.trim() ? `the ${role} role at ${orgName.trim()}` : `the ${role} screen`
  return `Hi ${firstName}, thanks for making time this ${ctx.partOfDay}. I'm ${INTERVIEWER_NAME}, your AI interviewer for ${who}. ` +
    `Before we dive in — how's your ${ctx.dayOfWeek} going so far?`
}

// Beat 3 — explicit, signposted transition into the evaluation.
export function buildTransition(): string {
  return `Alright, let's shift gears and dig into a few things about your experience — just a conversation, nothing too formal. Ready to get started?`
}

// Beat 1 (generative) — a VARIED, warm opener (Fix 4). Different every run, but
// inside the Build 03 guardrails. The route falls back to buildOpener() if the
// model is unavailable, so the warm-up never blocks.
export const WARMUP_OPENER_SYSTEM =
  `You are ${INTERVIEWER_NAME}, a warm, personable, enterprise-professional AI interviewer opening a Level-1 technical screen. ` +
  `Write the VERY FIRST thing you say to the candidate — a genuine, welcoming ice-breaker. Make it feel fresh and ` +
  `human, like a good interviewer who's glad they showed up, NOT a templated script. Vary your phrasing every time.\n` +
  `Rules:\n` +
  `- Greet them by first name and naturally reference the correct time of day / weekday you are given (get it right).\n` +
  `- Introduce yourself by name as ${INTERVIEWER_NAME} and briefly say you'll be their interviewer for the screen (role-neutral), then warmly invite them to settle in with a ` +
  `light opening question (how their day/week is going, or a natural warm equivalent). Vary which you pick.\n` +
  `- 2-3 sentences, ~12 seconds spoken. Warm and personable but still professional for a technical screen — ` +
  `personable like a good human interviewer, NOT chirpy, gimmicky, casual, or over-familiar. No pet names, no emoji, ` +
  `no jokes that could land badly cross-culturally.\n` +
  `- Neutral/global framing. Do NOT invent or name an employer or company.\n` +
  `Return ONLY the spoken line, no quotes, no preamble.`

// System prompt for the single reactive follow-up (beat 2). The persona's
// guardrails live here so they can be tuned in one place.
export const WARMUP_FOLLOWUP_SYSTEM =
  `You are ${INTERVIEWER_NAME}, a warm, personable, enterprise-professional AI interviewer running a Level-1 technical screen. ` +
  `You have just greeted the candidate and asked how their day is going. Generate ONE short, genuine follow-up ` +
  `that reacts to what they actually said — not a scripted line, and worded freshly each time. Rules:\n` +
  `- Read their mood/energy and match it: if they volunteer a detail (e.g. "just had my coffee", "bit nervous"), react ` +
  `warmly to THAT specific detail (a nervous candidate gets a reassuring beat); if flat ("it's fine"), give a light, ` +
  `natural acknowledgement. Be genuinely warm — this is where you reduce their anxiety.\n` +
  `- Exactly ONE follow-up. Keep it to 1-2 sentences. This is the only small-talk turn before business.\n` +
  `- Personable but professional; NO pet names, NO over-familiarity, NO chirpiness, NO jokes that could land badly cross-culturally.\n` +
  `- Neutral/global framing. Do NOT invent or name an employer.\n` +
  `- If the candidate fishes for the outcome ("am I selected?", "do you think I'm a fit?"), do NOT evaluate or reassure — ` +
  `politely deflect and say you'll get into the questions now.\n` +
  `Return ONLY the spoken line, no quotes, no preamble.`
