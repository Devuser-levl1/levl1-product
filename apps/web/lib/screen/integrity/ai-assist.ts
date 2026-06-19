import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

// ── T2-1 AI-assisted answer detection (Screen-scoped, Build 02) ────────────
// Assesses whether an answer shows LLM-pattern tells, AND whether it represents
// an uncharacteristic capability jump vs. the candidate's own conversational
// baseline earlier in the SAME session. Evidence-linked: returns a confidence,
// a short rationale, and the specific answer SPAN it refers to — never a bare
// verdict. Only the text needed for analysis is sent to Claude (no raw video).
//
// COST LEVER: this is the only Claude call in the integrity layer. It runs only
// when enabled (Position.aiAssistCheck / plan tier), so it can be turned off on
// cost-sensitive plans. Latency + paste heuristics stay on regardless.

export interface AiAssistInput {
  answer: string                 // the answer under analysis (code or spoken)
  baseline?: string              // candidate's earlier conversational answers (same session)
  questionText?: string
  statedExperience?: string | null
}

export interface AiAssistFlag {
  type: 'ai_assisted_answer'
  confidence: number
  rationale: string
  span: string                   // the specific snippet the judgement refers to
  meta: Record<string, unknown>
}

const MIN_ANSWER_CHARS = 120     // too short to judge → skip (and save cost)
const FLAG_THRESHOLD = 0.6

// `enabled` is the tier/cost toggle; pass false to skip the API call entirely.
export async function analyzeAiAssist(input: AiAssistInput, opts: { enabled: boolean }): Promise<AiAssistFlag | null> {
  if (!opts.enabled) return null
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const answer = (input.answer ?? '').trim()
  if (answer.length < MIN_ANSWER_CHARS) return null

  const client = new Anthropic({ apiKey })
  const prompt = `You are an integrity analyst for a live technical screening. Invisible overlay assistants (interview-copilot tools) feed a candidate a fully-formed answer to READ while they appear to think — they leave no tab-switch and nothing on screen-share, so the answer TEXT is the main signal. Judge whether the ANSWER below is likely LLM-generated or read off such an assistant, on the balance of these tells:
- Over-structured boilerplate / textbook framing inconsistent with live, spoken problem-solving.
- Reads like written prose delivered verbatim: a long, perfectly-ordered answer with NONE of the hesitation, false starts, filler, or self-correction natural to a SPOKEN reply — it sounds READ, not recalled.
- Uncharacteristic completeness or polish vs. the candidate's own BASELINE (their earlier conversational answers this session) — a sudden capability/eloquence jump.
- Generic framing inconsistent with their STATED EXPERIENCE.
Be conservative: natural competence and a genuinely articulate candidate are NOT tells. Only raise likelihood for genuine LLM-pattern / read-aloud signals. No single tell is conclusive.

QUESTION: ${input.questionText ?? '(not provided)'}
STATED EXPERIENCE: ${input.statedExperience ?? '(not provided)'}

CANDIDATE BASELINE (earlier answers, same session):
${(input.baseline ?? '(none captured)').slice(0, 1500)}

ANSWER UNDER ANALYSIS:
${answer.slice(0, 2500)}

Return ONLY JSON (no markdown):
{ "aiLikelihood": <0-1>, "rationale": "<one concise sentence citing the specific tell>", "span": "<a short verbatim snippet (<=160 chars) from the ANSWER that best evidences your judgement>" }`

  try {
    const resp = await client.messages.create({ model: CLAUDE_MODEL, max_tokens: 400, temperature: 0, messages: [{ role: 'user', content: prompt }] })
    const raw = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { aiLikelihood?: number; rationale?: string; span?: string }
    const confidence = Math.max(0, Math.min(1, Number(parsed.aiLikelihood) || 0))
    if (confidence < FLAG_THRESHOLD) return null
    const span = (typeof parsed.span === 'string' && parsed.span.trim() ? parsed.span : answer.slice(0, 160)).slice(0, 200)
    return {
      type: 'ai_assisted_answer',
      confidence,
      rationale: (parsed.rationale ?? 'Answer shows LLM-pattern characteristics.').slice(0, 300),
      span,
      meta: { aiLikelihood: confidence, span, questionText: input.questionText ?? null },
    }
  } catch (e) {
    console.error('[ai-assist] analysis failed:', e instanceof Error ? e.message : e)
    return null  // never block the interview on an integrity check
  }
}
