import type { KnockoutQuestion } from '@/lib/screen/position-config'
import type { LogisticsConfig } from './config'
import { workAuthQuestion } from './config'

// ── Logistics topic tracking (Fixpack 6 #4) — Screen-scoped ────────────────
// The segment used to rely on the model re-deriving "what have I asked?" from
// the conversation each turn, so a silent reply or a long negotiation could
// make it circle back (e.g. re-ask relocation). Topics are now tracked
// deterministically: every interviewer turn is tagged with the topic its
// QUESTION is about, and a topic that was already asked can't be asked again
// (beyond a bounded, consecutive follow-up allowance).

export type LogisticsTopic = 'location' | 'notice' | 'comp' | 'workauth' | `knockout:${string}` | 'close'

/** Marker the room sends for a reply that never came (silence timeout). */
export const NO_RESPONSE = '[no response]'

const BASE_ORDER: LogisticsTopic[] = ['location', 'notice', 'comp', 'workauth']

/** Max CONSECUTIVE interviewer turns allowed on one topic (negotiation / one clarifier). */
function allowance(topic: LogisticsTopic): number {
  if (topic === 'location') return 3          // clarify → state constraint → flexibility question
  return 2                                    // the question + one clarifier
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** The sentence that carries the question (reflect-backs mention the previous topic). */
function questionPart(say: string): string {
  const sentences = say.split(/(?<=[.?!])\s+/)
  const qs = sentences.filter((s) => s.includes('?'))
  return (qs.length ? qs[qs.length - 1] : sentences[sentences.length - 1] ?? say)
}

/** Which topic an interviewer line is asking about (null = no recognisable question). */
export function inferTopic(say: string, knockouts: KnockoutQuestion[] = []): LogisticsTopic | null {
  const q = questionPart(say)
  const nq = norm(q)
  for (const k of knockouts) {
    const key = norm(k.question).slice(0, 40)
    if (key && (nq.includes(key) || norm(say).includes(key))) return `knockout:${k.id}`
  }
  const l = q.toLowerCase()
  if (/authori[sz]|eligib|sponsor|\bvisa\b|right to work|legally/.test(l)) return 'workauth'
  if (/compensation|salary|\bctc\b|\bpay\b|package|remuneration/.test(l)) return 'comp'
  if (/notice|start date|earliest.*start|when could you start|available to (start|join)|joining/.test(l)) return 'notice'
  if (/relocat|based|on-?site|hybrid|remote|work (setup|mode|arrangement)|office days|in-office|commute|move to/.test(l)) return 'location'
  return null
}

export interface TopicState { asked: Set<LogisticsTopic>; last: LogisticsTopic | null; lastRun: number; lastReplySilent: boolean }

/** Topic state from the turns so far (AI turns carry `topic`; older clients fall back to inference). */
export function topicState(
  turns: { speaker: 'ai' | 'candidate'; text: string; topic?: string }[],
  knockouts: KnockoutQuestion[] = [],
): TopicState {
  const asked = new Set<LogisticsTopic>()
  let last: LogisticsTopic | null = null
  let lastRun = 0
  for (const t of turns) {
    if (t.speaker !== 'ai') continue
    const topic = (t.topic as LogisticsTopic | undefined) ?? inferTopic(t.text, knockouts)
    if (!topic) continue
    asked.add(topic)
    lastRun = topic === last ? lastRun + 1 : 1
    last = topic
  }
  const lastCandidate = [...turns].reverse().find((t) => t.speaker === 'candidate')
  return { asked, last, lastRun, lastReplySilent: lastCandidate?.text === NO_RESPONSE }
}

/** Full ordered topic list for this position. */
export function topicOrder(knockouts: KnockoutQuestion[] = []): LogisticsTopic[] {
  return [...BASE_ORDER, ...knockouts.map((k) => `knockout:${k.id}` as LogisticsTopic)]
}

export function nextUncovered(state: TopicState, knockouts: KnockoutQuestion[] = []): LogisticsTopic | null {
  return topicOrder(knockouts).find((t) => !state.asked.has(t)) ?? null
}

/** Is asking `topic` now a repeat that must be blocked? */
export function isRepeat(topic: LogisticsTopic, state: TopicState): boolean {
  if (topic === 'close' || !state.asked.has(topic)) return false
  if (topic !== state.last) return true                    // circling back to an earlier topic
  if (state.lastReplySilent) return true                   // no answer → move on, don't re-ask
  return state.lastRun >= allowance(topic)                 // follow-up allowance used up
}

/** Deterministic line for a topic — used when the model's line would repeat one. */
export function scriptedForTopic(topic: LogisticsTopic, cfg: LogisticsConfig, knockouts: KnockoutQuestion[], state: TopicState): string {
  const lead = state.lastReplySilent ? `No problem — we can come back to that with the recruiter. ` : `Thanks. `
  if (topic === 'notice') return `${lead}What's your current notice period, and what's the earliest you could start?`
  if (topic === 'comp') return `${lead}What are your compensation expectations for this role?`
  if (topic === 'workauth') return `${lead}${workAuthQuestion(cfg)}`
  if (topic.startsWith('knockout:')) {
    const k = knockouts.find((x) => `knockout:${x.id}` === topic)
    const firstKnockout = !state.asked.has(topicOrder(knockouts).find((t) => t.startsWith('knockout:')) ?? 'close')
    return `${firstKnockout ? `${lead}A couple of quick ones from the hiring team. ` : `${lead}`}${k?.question ?? ''}`.trim()
  }
  if (topic === 'location') return `${lead}Where are you based, and what kind of work setup are you looking for?`
  return `Thanks — I've noted all of that for the team.`
}

/** Human-readable topic list for the model prompt. */
export function describeTopics(topicsIn: Iterable<LogisticsTopic>, knockouts: KnockoutQuestion[] = []): string {
  const names: string[] = []
  for (const t of Array.from(topicsIn)) {
    if (t === 'location') names.push('location / work mode / relocation')
    else if (t === 'notice') names.push('notice period / start date')
    else if (t === 'comp') names.push('compensation expectations')
    else if (t === 'workauth') names.push('work authorization')
    else if (t.startsWith('knockout:')) {
      const k = knockouts.find((x) => `knockout:${x.id}` === t)
      names.push(`hiring-team question "${k?.question ?? t}"`)
    }
  }
  return names.length ? names.join('; ') : 'none yet'
}
