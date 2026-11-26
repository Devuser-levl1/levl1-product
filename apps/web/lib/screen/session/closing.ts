// ── Closing sequence (Screen-scoped, isomorphic) — #4 real-user bug ────────
// wrap-up signal → "do you have any questions for me?" → honest answer(s) →
// sign-off. The candidate-question segment is UNSCORED: its transcript lines
// carry segment 'closing_qa', which every scorer excludes (see
// UNSCORED_SEGMENTS). Copy lives here so it can be tuned in one place.

/** Transcript segments that never reach competency scoring. */
export const UNSCORED_SEGMENTS: readonly string[] = ['logistics', 'closing_qa']
export const isScoredSegment = (segment?: string) => !segment || !UNSCORED_SEGMENTS.includes(segment)

export const CLOSING_ASK = 'Before we finish, do you have any questions for me?'
export const CLOSING_ANYTHING_ELSE = 'Anything else you would like to ask?'
export const CLOSING_MAX_QUESTIONS = 2          // time-up: 1
export const CLOSING_REPLY_TIMEOUT_MS = 15000

export const wrapLine = (firstName: string, timeUp: boolean) => timeUp
  ? `Thank you ${firstName}, that's the time we have for the questions today.`
  : `Thank you ${firstName}, that brings us to the end of my questions. You covered a lot of ground, and I appreciate how thoughtfully you answered.`

export const signOff = (firstName: string) =>
  `Thanks again, ${firstName}. The hiring team will review this conversation and be in touch about next steps. It was great speaking with you, and all the best.`

/** "No", "nothing", "I'm good", "that's all" → no (more) questions. */
export function noQuestions(reply: string): boolean {
  const t = reply.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return true
  if (t.split(' ').length > 12) return false
  return /^(no|nope|nah|not really|none|nothing|no questions?|i'?m good|i'?m fine|all good|that'?s (all|it)|i think that'?s (all|it)|no that'?s (all|it)|not at the moment|not right now|no thanks?( you)?|nothing (else|more|for now))\b/.test(t) && !/\?|\b(what|how|when|why|who|which|can|could|will|would|is|are|do|does)\b.*\b(you|team|role|process|company|next)\b/.test(t)
}

export const closingAnswerSystem = (name: string) =>
  `You are ${name}, the AI interviewer, answering a candidate's question at the very end of a screening interview. ` +
  `Be warm, brief and HONEST. Rules:\n` +
  `- 1-3 short spoken sentences (under 60 words). Plain speech, no lists, no emoji, no stage directions.\n` +
  `- You do NOT know the outcome, the timeline, the salary, the team, the interviewers, or anything about the company beyond the role title. NEVER invent specifics (no "within a week", no numbers, no names, no promises).\n` +
  `- Next steps, said generally: the hiring team reviews this conversation and gets in touch about next steps.\n` +
  `- If asked how they did, or whether they passed: do not judge or hint. Say you can't share an assessment, the hiring team makes the decision, and thank them for their answers.\n` +
  `- If asked about the role, team, pay, benefits or culture and you don't know: say so honestly and suggest they ask the hiring team, who can answer properly.\n` +
  `- If asked about you / the AI / the process: be straightforward (you're an AI interviewer running the first-round screen; a person on the hiring team reviews the results).\n` +
  `- Do not ask a new interview question, and do not ask if they have more questions (the room does that).`

/** Safe answer when the model is unavailable — honest, no specifics. */
export function closingFallback(question: string): string {
  if (/\b(how did i|did i (do|pass)|my (score|result|performance)|pass(ed)?|selected|outcome)\b/i.test(question)) {
    return `I'm not able to share an assessment, I'm afraid. The hiring team reviews the conversation and makes the decision, and they'll be in touch.`
  }
  return `That's a good question, and honestly the hiring team is best placed to answer it properly. They'll review this conversation and be in touch about next steps.`
}
