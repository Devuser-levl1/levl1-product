// ── Interview modes (Screen-scoped, isomorphic) ────────────────────────────
//   conversational — Q&A + logistics + culture-fit (PM, sales, HR, ops…)
//   technical      — observe-and-defend work sample in the coding workspace,
//                    plus the technical Q&A (dev / eng / data)
//   hybrid         — conversation with one work-sample segment
// Position.interviewMode = null means "use the suggestion", so existing
// positions get a sensible mode without a backfill. The coding workspace
// (Run / Tests / Output) only exists in technical + hybrid.

export const INTERVIEW_MODES = ['conversational', 'technical', 'hybrid'] as const
export type InterviewMode = (typeof INTERVIEW_MODES)[number]

export const MODE_LABEL: Record<InterviewMode, { label: string; hint: string }> = {
  conversational: { label: 'Conversational', hint: 'Q&A, logistics and culture-fit — no coding workspace. For PM, sales, ops and other non-coding roles.' },
  technical:      { label: 'Technical work sample', hint: 'The candidate solves a real task in a coding workspace (run + tests), then defends their decisions.' },
  hybrid:         { label: 'Hybrid', hint: 'Conversation plus one hands-on work-sample segment.' },
}

export function isInterviewMode(v: unknown): v is InterviewMode {
  return typeof v === 'string' && (INTERVIEW_MODES as readonly string[]).includes(v)
}

const CODING = /\b(software|developer|engineer(ing)?|sde|swe|programmer|back[- ]?end|front[- ]?end|full[- ]?stack|devops|sre|data engineer|ml engineer|machine learning|platform|mobile|android|ios|qa automation|sdet|embedded|firmware|architect)\b/i
const NON_CODING = /\b(product manager|program manager|project manager|sales|account (executive|manager)|business development|marketing|recruit(er|ing)|hr\b|human resources|customer success|support|operations|finance|accountant|designer|ux|ui designer|content|writer|analyst relations|consultant|scrum master)\b/i
const CODE_STACK = /^(python|java|javascript|typescript|go|golang|c\+\+|c#|rust|kotlin|swift|scala|ruby|php|node|react|angular|vue|spring|django|flask|sql|spark|pandas|pytorch|tensorflow|kubernetes|terraform)$/i

/** Mode the JD / role suggests (HR can override at setup). */
export function suggestMode(p: { title?: string | null; jdText?: string | null; techStack?: string[] | null; roleType?: string | null }): InterviewMode {
  const title = p.title ?? ''
  if (NON_CODING.test(title) && !CODING.test(title)) return 'conversational'
  const codeSkills = (p.techStack ?? []).filter((s) => CODE_STACK.test(s.trim())).length
  if (CODING.test(title)) return codeSkills > 0 || /code|coding|implement|develop|build/i.test(p.jdText ?? '') ? 'technical' : 'hybrid'
  if (/manager|lead|head|director/i.test(title) && codeSkills > 0) return 'hybrid'
  if (codeSkills >= 2) return 'technical'
  return 'conversational'
}

/** Effective mode for a position (explicit choice wins; else the suggestion). */
export function resolveMode(p: { interviewMode?: string | null; title?: string | null; jdText?: string | null; techStack?: string[] | null; roleType?: string | null }): InterviewMode {
  return isInterviewMode(p.interviewMode) ? p.interviewMode : suggestMode(p)
}

export const hasWorkspace = (m: InterviewMode) => m !== 'conversational'
