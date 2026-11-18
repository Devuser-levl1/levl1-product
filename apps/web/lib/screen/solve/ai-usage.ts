import Anthropic from '@anthropic-ai/sdk'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { digest, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import type { WorkSampleTask } from '@/lib/screen/workspace/task'
import type { AiExchange } from './assistant'

// ── AI use in Solve (Screen-scoped, server-only) ───────────────────────────
// 1. Deterministic usage metrics from the assistant log + timeline + final code:
//    what was asked, what was inserted, how much of each suggestion SURVIVED
//    into the final code (kept / edited / removed), which final lines came from
//    AI, and whether they ran the code after taking AI output.
// 2. AI-fluency judgment (SCORING_MODEL), evidence-linked to A# exchanges,
//    M# timeline moments and D# defense lines. A SEPARATE axis — "used AI well",
//    not "used AI less". Only when the assistant was allowed.
// 3. Code provenance check when AI was NOT allowed — Screen's AI-assist
//    detector pattern (flag shape, 0.6 threshold, per-position cost toggle
//    Position.aiAssistCheck) with code-appropriate tells. Review-only flag.

const norm = (l: string) => l.trim().replace(/\s+/g, ' ')
const significant = (l: string) => norm(l).length >= 8 && !/^[{}()[\];,]+$/.test(norm(l))

export interface BlockFate { id: string; inserted: boolean; chars: number; survival: number; fate: 'kept' | 'edited' | 'removed' }
export interface AiUsageMetrics {
  prompts: number
  codeShared: number
  inserts: number
  insertedChars: number
  blocks: BlockFate[]                           // blocks inserted/copied, or visibly reused
  aiShareOfFinal: number                        // 0–1 of the final code's significant lines that match AI output
  aiLines: { from: number; to: number; ref: string }[]   // final-code line ranges that came from AI
  verifiedAfterInsert: number                   // inserts followed by a run / test run before the next insert
  firstPromptAtMs: number | null
  firstEditAtMs: number | null
}

export function aiUsageMetrics(exchanges: AiExchange[], timeline: TimelineEvent[], finalCode: string, starter: string): AiUsageMetrics {
  const starterLines = new Set(starter.split('\n').map(norm))
  const finalLines = finalCode.split('\n')
  const finalSet = new Set(finalLines.map(norm))
  const ev = [...timeline].sort((a, b) => a.t - b.t)
  const insertEvents = ev.filter((e) => e.k === 'ai_insert' || e.k === 'ai_copy')
  const insertedRefs = new Map<string, number>()
  insertEvents.forEach((e) => { if (e.ref) insertedRefs.set(e.ref, (insertedRefs.get(e.ref) ?? 0) + (e.n ?? 0)) })

  // Which AI line produced each final line (first block wins).
  const lineOrigin = new Map<string, string>()
  const blocks: BlockFate[] = []
  for (const x of exchanges) for (const b of x.blocks) {
    const lines = b.code.split('\n').filter(significant).map(norm).filter((l) => !starterLines.has(l))
    if (!lines.length) continue
    const present = lines.filter((l) => finalSet.has(l)).length
    const survival = present / lines.length
    lines.forEach((l) => { if (finalSet.has(l) && !lineOrigin.has(l)) lineOrigin.set(l, b.id) })
    const inserted = insertedRefs.has(b.id)
    if (inserted || survival >= 0.3) blocks.push({ id: b.id, inserted, chars: insertedRefs.get(b.id) ?? b.code.length, survival: Math.round(survival * 100) / 100, fate: survival >= 0.8 ? 'kept' : survival >= 0.3 ? 'edited' : 'removed' })
  }

  const sigFinal = finalLines.map((l, i) => ({ l: norm(l), i })).filter(({ l }) => significant(l) && !starterLines.has(l))
  const fromAi = sigFinal.filter(({ l }) => lineOrigin.has(l))
  const aiLines: AiUsageMetrics['aiLines'] = []
  for (const { l, i } of fromAi) {
    const ref = lineOrigin.get(l)!.split('.')[0]
    const last = aiLines[aiLines.length - 1]
    if (last && last.ref === ref && i + 1 - last.to <= 2) last.to = i + 1
    else aiLines.push({ from: i + 1, to: i + 1, ref })
  }

  let verified = 0
  insertEvents.forEach((e, idx) => {
    const until = insertEvents[idx + 1]?.t ?? Infinity
    if (ev.some((x) => (x.k === 'run' || x.k === 'tests') && x.t > e.t && x.t < until)) verified++
  })
  const d = digest(timeline)
  return {
    prompts: exchanges.filter((x) => !x.error).length,
    codeShared: exchanges.filter((x) => x.includedCode).length,
    inserts: insertEvents.length,
    insertedChars: insertEvents.reduce((s, e) => s + (e.n ?? 0), 0),
    blocks: blocks.slice(0, 30),
    aiShareOfFinal: sigFinal.length ? Math.round((fromAi.length / sigFinal.length) * 100) / 100 : 0,
    aiLines: aiLines.slice(0, 20),
    verifiedAfterInsert: verified,
    firstPromptAtMs: exchanges.length ? Math.min(...exchanges.map((x) => x.t)) : null,
    firstEditAtMs: d.timeToFirstEditMs,
  }
}

/** Compact, prompt-ready summary of the AI exchanges + what happened to their code. */
export function aiUsageText(exchanges: AiExchange[], m: AiUsageMetrics, maxResponse = 900): string {
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
  const fate = new Map(m.blocks.map((b) => [b.id, b]))
  return exchanges.map((x) => {
    const bl = x.blocks.map((b) => { const f = fate.get(b.id); return `${b.id}: ${f ? `${f.inserted ? 'inserted' : 'reused'}, ${f.fate} (${Math.round(f.survival * 100)}% survives)` : 'not used'}` }).join('; ')
    return `${x.id} @${mmss(x.t)}${x.includedCode ? ' [shared their code]' : ''}\nASKED: ${x.prompt.slice(0, 600)}\nAI ANSWERED: ${x.error ? `(error) ${x.error}` : x.response.slice(0, maxResponse)}${bl ? `\nCODE BLOCKS: ${bl}` : ''}`
  }).join('\n\n').slice(0, 14_000)
}

function outermostJson(text: string): Record<string, unknown> | null {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
}

import { FLUENCY_DIMENSIONS, type FluencyDimension, type FluencyRating } from './ai-fluency-labels'
export { FLUENCY_DIMENSIONS, FLUENCY_LABEL, type FluencyDimension, type FluencyRating } from './ai-fluency-labels'

export interface AiFluency {
  score: number | null
  rationale: string
  evidence: { ref: string; note: string }[]
  dimensions: Record<FluencyDimension, { rating: FluencyRating; note: string }>
  caughtMistakes: { ref: string; note: string }[]
  summary: string
}

const RATINGS: FluencyRating[] = ['strong', 'adequate', 'weak', 'not_evidenced']

export async function scoreAiFluency(o: {
  task: WorkSampleTask; language: string; code: string; exchanges: AiExchange[]; metrics: AiUsageMetrics
  timeline: TimelineEvent[]; testsLine: string; defenseLines: string[]
}): Promise<AiFluency | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !o.exchanges.length) return null
  const lines = o.code.split('\n')
  const origin = new Map<number, string>()
  o.metrics.aiLines.forEach((r) => { for (let i = r.from; i <= r.to; i++) origin.set(i, r.ref) })
  const numbered = lines.slice(0, 400).map((l, i) => `${String(i + 1).padStart(3)}${origin.has(i + 1) ? ` [${origin.get(i + 1)}]` : '     '} ${l}`).join('\n').slice(0, 12_000)
  const m = o.metrics
  try {
    const res = await new Anthropic({ apiKey: key }).messages.create({
      model: SCORING_MODEL,
      max_tokens: 2500,
      system:
        'You assess a developer\'s AI FLUENCY: how well they worked WITH an AI coding assistant on a take-home where AI use was allowed. ' +
        'Using AI is expected and is NOT penalised. Judge the quality of the collaboration: did they break the problem down and ask focused questions (not just paste the whole task); ' +
        'did they give useful context; did they run / test what the AI gave them; did they notice and fix AI mistakes or push back on wrong suggestions; do they understand and own the final code (see the defense). ' +
        'Blindly accepting large blocks without verification, or being unable to explain AI-written lines, is weak. Cite evidence for every claim with refs: A# (exchange), M# (timeline moment), D# (defense line). ' +
        'Only credit what is evidenced. Plain text, no emoji. Return ONLY JSON.',
      messages: [{
        role: 'user',
        content:
          `TASK: ${o.task.title}\n${o.task.prompt.slice(0, 1200)}\n\n` +
          `USAGE (measured): ${m.prompts} prompts (${m.codeShared} shared their code), ${m.inserts} inserts/copies (${m.insertedChars} chars), ` +
          `${m.verifiedAfterInsert}/${m.inserts} inserts followed by a run or test run, ~${Math.round(m.aiShareOfFinal * 100)}% of final significant lines match AI output. ` +
          `First prompt at ${m.firstPromptAtMs === null ? '—' : `${Math.round(m.firstPromptAtMs / 1000)}s`}, first own edit at ${m.firstEditAtMs === null ? '—' : `${Math.round(m.firstEditAtMs / 1000)}s`}.\n\n` +
          `AI EXCHANGES:\n${aiUsageText(o.exchanges, m)}\n\n` +
          `FINAL CODE (${o.language}; [A#] marks lines that match AI output):\n${numbered}\n\nRESULT: ${o.testsLine}\n\n` +
          `TIMELINE:\n${digest(o.timeline).text}\n\n` +
          `DEFENSE:\n${o.defenseLines.length ? o.defenseLines.map((l, i) => `D${i + 1} ${l}`).join('\n') : '(none)'}\n\n` +
          'Return JSON: {"score":0-100,"rationale":"…","evidence":[{"ref":"A2","note":"…"}],' +
          `"dimensions":{${FLUENCY_DIMENSIONS.map((d) => `"${d}":{"rating":"strong|adequate|weak|not_evidenced","note":"…"}`).join(',')}},` +
          '"caughtMistakes":[{"ref":"A3","note":"what the AI got wrong and how they caught it"}],"summary":"2 sentences for the hiring team"}',
      }],
    })
    if (res.stop_reason === 'max_tokens' || res.stop_reason === 'refusal') return null
    const j = outermostJson(res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(''))
    if (!j) return null
    const refs = (v: unknown, n: number) => (Array.isArray(v) ? v : []).slice(0, n).flatMap((e) => {
      const r = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>
      return typeof r.ref === 'string' && typeof r.note === 'string' ? [{ ref: r.ref.slice(0, 8), note: r.note.slice(0, 300) }] : []
    })
    const dims = (j.dimensions && typeof j.dimensions === 'object' ? j.dimensions : {}) as Record<string, { rating?: unknown; note?: unknown }>
    const n = Number(j.score)
    return {
      score: Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null,
      rationale: typeof j.rationale === 'string' ? j.rationale.slice(0, 600) : '',
      evidence: refs(j.evidence, 6),
      dimensions: Object.fromEntries(FLUENCY_DIMENSIONS.map((d) => [d, {
        rating: RATINGS.includes(dims[d]?.rating as FluencyRating) ? dims[d]!.rating as FluencyRating : 'not_evidenced',
        note: typeof dims[d]?.note === 'string' ? (dims[d]!.note as string).slice(0, 300) : '',
      }])) as AiFluency['dimensions'],
      caughtMistakes: refs(j.caughtMistakes, 5),
      summary: typeof j.summary === 'string' ? j.summary.slice(0, 500) : '',
    }
  } catch (e) {
    console.error(JSON.stringify({ evt: 'solve_ai_fluency_failed', err: e instanceof Error ? e.message.slice(0, 200) : String(e) }))
    return null
  }
}

export interface ProvenanceFlag { kind: 'ai_generated_code'; confidence: number; note: string; span: string }
const FLAG_THRESHOLD = 0.6   // same bar as Screen's AI-assist detector

/** AI NOT allowed: is the submitted code likely AI-generated? Conservative, review-only. */
export async function checkCodeProvenance(o: { task: WorkSampleTask; language: string; code: string; timeline: TimelineEvent[]; defenseLines: string[] }): Promise<ProvenanceFlag | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || o.code.trim().length < 200) return null
  const d = digest(o.timeline)
  const snaps = o.timeline.filter((e) => e.k === 'snapshot' && e.code).slice(-4).map((e) => `@${Math.round(e.t / 1000)}s (${e.code!.length} chars)`).join(', ')
  try {
    const res = await new Anthropic({ apiKey: key }).messages.create({
      model: SCORING_MODEL,
      max_tokens: 500,
      system: 'You are an integrity analyst for a take-home coding assessment where AI coding assistants were NOT allowed. Be conservative: competent, clean code is NOT a tell. Return ONLY JSON.',
      messages: [{
        role: 'user',
        content:
          'Judge how likely the FINAL CODE was produced by an AI assistant rather than written by the candidate, weighing these tells together (no single one is conclusive):\n' +
          '- HOW it arrived: large pastes, very little typing relative to the final size, complete working code appearing in one step without intermediate states.\n' +
          '- LLM style: tutorial-style comments narrating every step, generic docstrings, defensive boilerplate the task does not need, a style that shifts abruptly between parts.\n' +
          '- Ownership: in the defense, vague or wrong explanations of specific lines they submitted.\n\n' +
          `TASK: ${o.task.title}\n\nWORK PROCESS: ${d.text}\nSnapshots: ${snaps || 'none'}\n\n` +
          `FINAL CODE (${o.language}):\n${o.code.slice(0, 8000)}\n\n` +
          `DEFENSE:\n${o.defenseLines.length ? o.defenseLines.join('\n').slice(0, 4000) : '(none)'}\n\n` +
          'Return JSON: {"aiLikelihood":0-1,"rationale":"one sentence citing the specific tells","span":"a short verbatim snippet (<=160 chars) of the code or process that best evidences it"}',
      }],
    })
    const j = outermostJson(res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(''))
    const confidence = Math.max(0, Math.min(1, Number(j?.aiLikelihood) || 0))
    if (confidence < FLAG_THRESHOLD) return null
    return {
      kind: 'ai_generated_code', confidence,
      note: `Possible AI-generated code (${Math.round(confidence * 100)}% likely): ${typeof j?.rationale === 'string' ? j.rationale.slice(0, 280) : 'LLM-pattern code.'}`,
      span: typeof j?.span === 'string' ? j.span.slice(0, 200) : '',
    }
  } catch (e) {
    console.error(JSON.stringify({ evt: 'solve_provenance_failed', err: e instanceof Error ? e.message.slice(0, 200) : String(e) }))
    return null
  }
}
