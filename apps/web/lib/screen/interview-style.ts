// ── Interview styles (Screen-scoped, isomorphic) ───────────────────────────
// ONE description per style, used for the setup tooltip AND the question-
// generation prompt — so what the recruiter reads is what the AI is told.
// The style shapes how the question set is WRITTEN (tone, ordering, depth);
// scoring criteria are identical across styles.

export const INTERVIEW_STYLES = ['Conversational', 'Structured', 'Pressure test'] as const
export type InterviewStyle = (typeof INTERVIEW_STYLES)[number]

export const STYLE_INFO: Record<InterviewStyle, { tooltip: string; prompt: string }> = {
  Conversational: {
    tooltip: 'Questions read like a natural discussion: open prompts that invite real stories and examples, in a relaxed tone. Good for behavioural, culture-fit and exploratory roles. Answers are scored against the same criteria as any style.',
    prompt: 'CONVERSATIONAL — write open, discussion-style questions that invite concrete stories and examples; warm, relaxed phrasing; let topics connect naturally. Keep the same assessment depth.',
  },
  Structured: {
    tooltip: 'A consistent, ordered set of clearly scoped questions, so every candidate gets a comparable interview. Best when you are comparing many candidates for the same role. This is the default.',
    prompt: 'STRUCTURED — write clearly scoped, standardised questions in a logical order (fundamentals before applied), each answerable on its own, so different candidates can be compared fairly.',
  },
  'Pressure test': {
    tooltip: 'Harder, more probing questions: edge cases, trade-offs and "what happens when it fails?", to test depth and composure. Suited to senior roles; it can feel intense for junior candidates.',
    prompt: 'PRESSURE TEST — write demanding questions that probe depth: edge cases, failure modes, trade-offs under constraints, and follow-ups that challenge the first answer. Stay professional and fair, never hostile or trick-based.',
  },
}

export const isInterviewStyle = (v: unknown): v is InterviewStyle => typeof v === 'string' && (INTERVIEW_STYLES as readonly string[]).includes(v)
