import Anthropic from '@anthropic-ai/sdk'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { execute, judge0Configured } from './judge0'
import { sanitizeTask, isWorkspaceLanguage, type WorkSampleTask, type WorkspaceLanguage } from './task'

// ── Work-sample task generation (Screen-scoped, server-only) ───────────────
// Drafts a realistic, role-specific task from the position. When Judge0 is
// configured the model's reference solution is executed against every test
// and the EXPECTED output is replaced with the real output (tests the
// reference fails are dropped) — so test cases are verified, not guessed.
// The reference solution itself is never stored.

export interface TaskPositionInput {
  title: string; company?: string | null; experienceLevel?: string | null
  techStack?: string[] | null; jdText?: string | null; primaryDomain?: string | null
}

function pickLanguage(stack: string[]): WorkspaceLanguage {
  const s = stack.join(' ').toLowerCase()
  if (/typescript|angular|nest/.test(s)) return 'typescript'
  if (/react|node|javascript|vue/.test(s)) return 'javascript'
  if (/\bgo\b|golang/.test(s)) return 'go'
  if (/java\b|spring|kotlin/.test(s)) return 'java'
  if (/c\+\+|cpp/.test(s)) return 'cpp'
  return 'python'
}

function outermostJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{'); const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

export async function generateWorkSampleTask(p: TaskPositionInput): Promise<{ task: WorkSampleTask | null; verified: boolean; note: string }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { task: null, verified: false, note: 'AI unavailable' }
  const language = pickLanguage(p.techStack ?? [])
  const client = new Anthropic({ apiKey: key })
  const res = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 6000,
    system:
      'You design short, realistic WORK-SAMPLE tasks for technical interviews. The candidate solves the task in a browser IDE, ' +
      'runs it against stdin→stdout test cases, then defends their decisions verbally.\n' +
      'Rules:\n' +
      '- A real-world slice of THIS role\'s day-to-day work (parsing logs, aggregating records, a small scheduler, rate limiting, ' +
      'data cleanup, an API-shaped transformation…) — NOT a puzzle or trick question.\n' +
      '- Solvable in ~10 minutes by a competent candidate at the stated level; standard library only; no network, no files.\n' +
      '- Program reads ALL input from stdin and prints the result to stdout. State the exact input and output format.\n' +
      '- It must contain at least one genuine design decision (data structure, edge-case policy, complexity trade-off) worth defending.\n' +
      '- 5–6 tests: 2 visible (simple), the rest hidden (edge cases: empty input, duplicates, large-ish input, malformed lines if relevant).\n' +
      '- Plain text only — no markdown, no emoji.\n' +
      'Return ONLY a JSON object.',
    messages: [{
      role: 'user',
      content:
        `Role: ${p.title}${p.company ? ` at ${p.company}` : ''}\nExperience: ${p.experienceLevel ?? 'unspecified'}\n` +
        `Tech stack: ${(p.techStack ?? []).join(', ') || 'unspecified'}\nDomain: ${p.primaryDomain ?? 'unspecified'}\n` +
        (p.jdText ? `Job description (excerpt):\n${p.jdText.slice(0, 3000)}\n` : '') +
        `\nCandidate language: ${language}.\n\nReturn JSON:\n{\n` +
        `  "title": "short task name",\n  "prompt": "what to build, input format, output format, one small worked example",\n` +
        `  "starterCode": "minimal ${language} skeleton that reads stdin (no solution logic)${language === 'java' ? '; class must be named Main' : ''}",\n` +
        `  "minutes": 10,\n  "tests": [{ "name": "...", "input": "exact stdin", "expected": "exact stdout", "hidden": false }],\n` +
        `  "lookFor": ["what a strong approach does"],\n  "probeAngles": ["decision points worth asking the candidate to defend"],\n` +
        `  "referenceSolution": "a correct, complete PYTHON 3 solution reading stdin"\n}`,
    }],
  })
  if (res.stop_reason === 'max_tokens' || res.stop_reason === 'refusal') return { task: null, verified: false, note: `Generation stopped (${res.stop_reason})` }
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
  const raw = outermostJson(text)
  if (!raw) return { task: null, verified: false, note: 'Unparseable task' }
  // Generated tasks are stdin-based (SQL tasks are authored in the task bank).
  const task = sanitizeTask({ ...raw, language: isWorkspaceLanguage(raw.language) && raw.language !== 'sql' ? raw.language : language })
  if (!task || task.tests.length < 2) return { task: null, verified: false, note: 'Task had too few tests' }

  // Verify tests against the reference solution (sandboxed in Judge0).
  const reference = typeof raw.referenceSolution === 'string' ? raw.referenceSolution : ''
  if (!reference || !judge0Configured()) return { task, verified: false, note: judge0Configured() ? 'No reference solution — tests unverified' : 'Judge0 not configured — tests unverified' }
  const verifiedTests = []
  for (const t of task.tests) {
    const r = await execute({ language: 'python', source: reference, stdin: t.input })
    if (r.status === 'ok' && r.stdout.trim()) verifiedTests.push({ ...t, expected: r.stdout.replace(/\s+$/, '') })
  }
  if (verifiedTests.filter((t) => !t.hidden).length < 1 || verifiedTests.length < 2) return { task, verified: false, note: 'Reference solution failed — tests unverified' }
  return { task: { ...task, tests: verifiedTests }, verified: true, note: `${verifiedTests.length} tests verified in Judge0` }
}
