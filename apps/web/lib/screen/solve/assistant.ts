import Anthropic from '@anthropic-ai/sdk'
import { SCREEN_UTILITY_MODEL } from '@/lib/screen/interview/model'
import type { WorkSampleTask } from '@/lib/screen/workspace/task'

// ── Solve built-in AI assistant (Screen-scoped, server-only) ───────────────
// Only when the position allows outside AI help (config.aiPolicy = 'allowed').
// It's a NORMAL, genuinely helpful coding assistant — never sabotaged — because
// what we assess is how the candidate WORKS WITH AI: how they break the problem
// down, what they ask, whether they verify and correct what comes back, and
// whether they end up owning the code. Every exchange is logged (encrypted) as
// evidence (A1, A2…); inserts / copies of its code are timeline events.
// It only knows what the candidate can see (task + visible examples + their
// code) — never hidden tests, the rubric or probe answers.

export const AI_MAX_PROMPTS = Math.max(5, Number(process.env.SOLVE_AI_MAX_PROMPTS) || 30)
export const AI_PROMPT_MAX_CHARS = 2000

export interface AiCodeBlock { id: string; lang: string; code: string }
export interface AiExchange {
  id: string                 // A1, A2…
  t: number                  // candidate timeline clock (ms) when asked
  at: string                 // server time
  prompt: string
  includedCode: boolean      // the candidate chose to share their current code
  codeChars: number
  response: string
  blocks: AiCodeBlock[]      // fenced code in the response (A1.1, A1.2…) — what can be inserted
  ms: number
  error?: string
}

/** Fenced code blocks → insertable blocks. */
export function codeBlocks(exchangeId: string, text: string): AiCodeBlock[] {
  const out: AiCodeBlock[] = []
  const re = /```([\w+#-]*)\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) && out.length < 8) {
    const code = m[2].replace(/\s+$/, '')
    if (code.trim()) out.push({ id: `${exchangeId}.${out.length + 1}`, lang: m[1] || '', code: code.slice(0, 12_000) })
  }
  return out
}

export async function askAssistant(o: {
  task: WorkSampleTask; language: string; prompt: string; code: string | null; history: AiExchange[]; id: string; t: number
}): Promise<AiExchange> {
  const started = Date.now()
  const base: Omit<AiExchange, 'response' | 'blocks' | 'ms'> = {
    id: o.id, t: o.t, at: new Date().toISOString(), prompt: o.prompt, includedCode: o.code !== null, codeChars: o.code?.length ?? 0,
  }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { ...base, response: '', blocks: [], ms: 0, error: 'The assistant is unavailable right now.' }

  const visible = o.task.tests.filter((t) => !t.hidden).slice(0, 3)
  const history = o.history.filter((h) => !h.error).slice(-4).flatMap((h) => [
    { role: 'user' as const, content: h.prompt },
    { role: 'assistant' as const, content: h.response.slice(0, 3000) },
  ])
  try {
    const res = await new Anthropic({ apiKey: key }).messages.create({
      model: SCREEN_UTILITY_MODEL,
      max_tokens: 1500,
      system:
        'You are a coding assistant built into a code editor, helping a developer with the task below. Be genuinely helpful and accurate, like a good pair programmer: ' +
        'answer what they ask, explain briefly, and put code in fenced blocks with a language tag. Prefer small, focused snippets over rewriting everything unless asked. ' +
        'If their request rests on a wrong assumption, say so. Programs read stdin and print to stdout.\n\n' +
        `TASK: ${o.task.title}\n${o.task.prompt.slice(0, 3000)}\n\n` +
        (visible.length ? `EXAMPLES:\n${visible.map((t) => `input:\n${t.input.slice(0, 600)}\noutput:\n${t.expected.slice(0, 300)}`).join('\n---\n')}\n\n` : '') +
        `LANGUAGE: ${o.language}`,
      messages: [
        ...history,
        { role: 'user', content: (o.code !== null ? `My current code:\n\`\`\`${o.language}\n${o.code.slice(0, 12_000)}\n\`\`\`\n\n` : '') + o.prompt },
      ],
    })
    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').slice(0, 12_000)
    if (!text.trim()) throw new Error(`empty response (${res.stop_reason})`)
    return { ...base, response: text, blocks: codeBlocks(o.id, text), ms: Date.now() - started }
  } catch (e) {
    console.error(JSON.stringify({ evt: 'solve_assistant_error', err: e instanceof Error ? e.message.slice(0, 200) : String(e) }))
    return { ...base, response: '', blocks: [], ms: Date.now() - started, error: 'The assistant couldn\'t answer just now. Try again.' }
  }
}
