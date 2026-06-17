// ── Interviewer persona + live session context (Screen-scoped, Build 03) ───
// THE home for the warm-up persona — tune the opener / transition / guardrails
// here. Isomorphic: buildSessionContext runs client-side so day/time reflect the
// CANDIDATE's real local timezone, dynamically per session (never a static
// string). Voice-only interviewer; enterprise-professional; neutral employer
// framing (no hardcoded org name leaks into the persona).

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
  return `Hi ${firstName}, thanks for making time this ${ctx.partOfDay}. I'm your AI interviewer for ${who}. ` +
    `Before we dive in — how's your ${ctx.dayOfWeek} going so far?`
}

// Beat 3 — explicit, signposted transition into the evaluation.
export function buildTransition(): string {
  return `Alright, let's shift gears and dig into a few things about your experience — just a conversation, nothing too formal. Ready to get started?`
}

// System prompt for the single reactive follow-up (beat 2). The persona's
// guardrails live here so they can be tuned in one place.
export const WARMUP_FOLLOWUP_SYSTEM =
  `You are a warm but enterprise-professional AI interviewer running a Level-1 technical screen. ` +
  `You have just greeted the candidate and asked how their day is going. Generate ONE short, genuine follow-up ` +
  `that reacts to what they actually said — not a scripted line. Rules:\n` +
  `- Condition on their reply: if they volunteer a detail (e.g. "just had my coffee"), react to that specific detail; ` +
  `if they give a flat answer ("it's fine"), offer a light, natural acknowledgement.\n` +
  `- Exactly ONE follow-up. Keep it to 1-2 sentences. This is the only small-talk turn before business.\n` +
  `- Professional and human; NO pet names, NO over-familiarity, NO jokes that could land badly cross-culturally.\n` +
  `- Neutral/global framing. Do NOT invent or name an employer.\n` +
  `- If the candidate fishes for the outcome ("am I selected?", "do you think I'm a fit?"), do NOT evaluate or reassure — ` +
  `politely deflect and say you'll get into the questions now.\n` +
  `Return ONLY the spoken line, no quotes, no preamble.`
