import Anthropic from '@anthropic-ai/sdk'
import { LIVE_INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'
import { sanitizeRubric } from '@/lib/screen/taskbank/types'
import { digest, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import type { WorkSampleTask } from '@/lib/screen/workspace/task'
import type { FinalTestRow } from './evaluate'
import type { AiPolicy } from './config'

// ── Defend-your-submission brain (Screen-scoped, server-only) ──────────────
// The moat: a short AI interview where the candidate defends THEIR submission.
// Same Observe & Defend grounding as the Screen room's work-sample follow-ups:
// the candidate's actual code, the evidence-linked work timeline (M1…), the
// test results, and the rubric's EXPECTED probe answers (interviewer-only —
// never sent to the browser). Someone who didn't do the work can't answer
// "why this, not that?" about specific lines of their own code.

export interface DefenseTurn { speaker: 'ai' | 'candidate'; text: string; at: string; mode?: 'voice' | 'typed' }

export interface DefenseContext {
  firstName: string
  task: WorkSampleTask
  language: string
  code: string
  timeline: TimelineEvent[]
  finalTests: FinalTestRow[] | null
  aiPolicy: AiPolicy
  maxFollowUps: number
  // Built-in assistant use (aiPolicy = allowed): exchange summary + which final lines came from AI.
  ai?: { summary: string; lines: { from: number; to: number; ref: string }[] } | null
}

/** Line 1. Names the task so the transcript is self-describing. */
export function openerLine(c: Pick<DefenseContext, 'firstName' | 'task'>): string {
  return `Hi ${c.firstName}, I'm ${INTERVIEWER_NAME}. I've gone through your submission for "${c.task.title}". This will take about ten minutes. ` +
    'To start, walk me through your solution: the overall approach, and why you chose it.'
}

export const closingLine = (firstName: string) =>
  `Thank you, ${firstName}. That's everything I wanted to ask. Your submission and this conversation go to the hiring team together. You can close this page now.`

function outermostJson(text: string): Record<string, unknown> | null {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
}

const numbered = (code: string, ai?: DefenseContext['ai']) => {
  const origin = new Map<number, string>()
  ai?.lines.forEach((r) => { for (let i = r.from; i <= r.to; i++) origin.set(i, r.ref) })
  return code.split('\n').slice(0, 400).map((l, i) => `${String(i + 1).padStart(3, ' ')}${origin.has(i + 1) ? ` [${origin.get(i + 1)}]` : '     '} ${l}`).join('\n').slice(0, 14_000)
}

export interface NextTurn { say: string; done: boolean; degraded?: boolean }

/** Decide the next interviewer line after the candidate's latest answer. */
export async function nextDefenseTurn(c: DefenseContext, turns: DefenseTurn[]): Promise<NextTurn> {
  const asked = turns.filter((t) => t.speaker === 'ai').length   // includes the opener
  const followUpsAsked = Math.max(0, asked - 1)
  if (followUpsAsked >= c.maxFollowUps) return { say: closingLine(c.firstName), done: true }

  const rubric = sanitizeRubric(c.task.rubric ?? {})
  const tl = digest(c.timeline)
  const tests = c.finalTests ? `${c.finalTests.filter((t) => t.passed).length}/${c.finalTests.length} tests passing (hidden included). Failing: ${c.finalTests.filter((t) => !t.passed).map((t) => t.hidden ? 'a hidden test' : t.name).join(', ') || 'none'}.` : 'Tests could not be run.'
  const convo = turns.map((t) => `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text.slice(0, 1200)}`).join('\n')
  const remaining = c.maxFollowUps - followUpsAsked

  const key = process.env.ANTHROPIC_API_KEY
  if (key) {
    try {
      const res = await new Anthropic({ apiKey: key }).messages.create({
        model: LIVE_INTERVIEW_MODEL,
        max_tokens: 700,
        system:
          `You are ${INTERVIEWER_NAME}, a senior engineer running a short spoken DEFENSE of a take-home the candidate already submitted. ` +
          'Your job is to find out whether they genuinely understand and own THIS code. Ask ONE question at a time, anchored in something specific they wrote ' +
          '(name the function, the data structure, the line range, or a timeline moment such as "you rewrote most of it about twenty minutes in"). ' +
          'Good angles: why this approach over an obvious alternative; walk through a specific part; what happens on an edge case or a failing test; complexity; what breaks at 100x scale; what they would change with more time. ' +
          'If an answer is vague or generic, press on the same point once with a more concrete question. If they could not explain a pasted block, ask about that block. ' +
          'Never reveal expected answers, never teach, never grade aloud. Keep each question under 45 words, conversational, plain spoken English (it is read aloud), no code blocks, no emoji. ' +
          'Return ONLY JSON.',
        messages: [{
          role: 'user',
          content:
            `TASK: ${c.task.title}\n${c.task.prompt.slice(0, 1500)}\n\n` +
            `THEIR FINAL CODE (${c.language}, line-numbered${c.ai?.lines.length ? '; [A#] marks lines that came from the AI assistant' : ''}):\n${numbered(c.code, c.ai)}\n\n` +
            (c.ai?.summary ? `HOW THEY USED THE BUILT-IN AI ASSISTANT:\n${c.ai.summary}\n\n` : '') +
            `RESULT: ${tests}\n\nHOW THE WORK EVOLVED (timeline):\n${tl.text}\n\n` +
            (c.task.probeAngles.length ? `DECISIONS WORTH DEFENDING: ${c.task.probeAngles.join('; ')}\n\n` : '') +
            (rubric.probes.length ? 'RUBRIC PROBES (interviewer-only; pick one that fits what THEY did, ask it in your own words anchored in their code):\n' +
              rubric.probes.map((p) => `- ${p.decision}: ${p.question} (strong answer: ${p.strongAnswer})`).join('\n') + '\n\n' : '') +
            `POLICY: outside AI help was ${c.aiPolicy === 'allowed' ? 'ALLOWED — that is fine, but they must still understand and own every line' : 'NOT allowed'}.\n\n` +
            (c.ai?.summary && !turns.some((t) => t.speaker === 'ai' && /\b(AI|assistant|suggest)/i.test(t.text))
              ? 'AI USE: they used the assistant and you have not asked about it yet. Make ONE of your remaining questions about a specific AI interaction: why they accepted, changed or rejected a particular suggestion, or have them explain specific [A#] lines in their own words, or how they checked the AI was right. Be neutral: using AI was allowed.\n\n'
              : '') +
            `CONVERSATION SO FAR:\n${convo}\n\n` +
            `You may ask at most ${remaining} more question${remaining === 1 ? '' : 's'}. ` +
            'If you already have clear evidence either way and further questions would add nothing, you may finish early. ' +
            'Return JSON: {"done": false, "say": "<your next question>"} or {"done": true}',
        }],
      })
      if (res.stop_reason !== 'max_tokens' && res.stop_reason !== 'refusal') {
        const j = outermostJson(res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(''))
        if (j?.done === true && followUpsAsked >= 2) return { say: closingLine(c.firstName), done: true }
        const say = typeof j?.say === 'string' ? j.say.replace(/\s+/g, ' ').trim().slice(0, 400) : ''
        if (say) return { say, done: false }
      }
      console.error(JSON.stringify({ evt: 'solve_defense_brain_unusable', stop: res.stop_reason }))
    } catch (e) {
      console.error(JSON.stringify({ evt: 'solve_defense_brain_error', err: e instanceof Error ? e.message.slice(0, 200) : String(e) }))
    }
  }
  // Degraded (loud, flagged in the report): fall back to the task's own decision points.
  const angles = [...c.task.probeAngles, ...rubric.probes.map((p) => p.question), 'what would break first if the input were a hundred times larger', 'what you would change with another hour']
  const angle = angles[followUpsAsked % angles.length]
  return { say: `Tell me about ${angle.replace(/[.?]$/, '')} in your solution. Point to the part of your code that handles it.`, done: false, degraded: true }
}
