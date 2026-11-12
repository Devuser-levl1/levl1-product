import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'
import { prisma } from '@/lib/prisma'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { sanitizeRubric } from '@/lib/screen/taskbank/types'
import { matchSkills } from '@/lib/screen/taskbank/select'
import { computeCoverage, coverageGuidance, type SkillCoverage } from '@/lib/screen/taskbank/coverage'
import { skillMapForPosition } from '@/lib/screen/taskbank/store'
import { readSelection } from '@/lib/screen/rubrics/types'
import { mustRubricIds, rubricSkillNodes, rubricTierGuidance } from '@/lib/screen/rubrics/coverage'
import { ttsModel, ttsSupportsAudioTags } from '@/lib/screen/interview/voice-config'
import { stripAudioTags, limitAudioTags } from '@/lib/screen/interview/audio-tags'

// Optional light delivery tags for v3/v4 voices (ELEVENLABS_TTS_AUDIO_TAGS=1).
function audioTagsOn(): boolean {
  if (process.env.ELEVENLABS_TTS_AUDIO_TAGS !== '1') return false
  try { return ttsSupportsAudioTags(ttsModel()) } catch { return false }
}
const TAG_GUIDANCE =
  'DELIVERY TAGS (optional, use sparingly): the interviewer voice understands a few delivery tags. You MAY begin followUpQuestion or confirmBack with ONE of: [warmly], [thoughtfully], [encouragingly], [curious], [reassuring]. Use a tag in at most about one line in three, never more than one per field, and never in any other field. When unsure, use none.\n\n'

// Technical content structure — server-side context the browser never sees:
//   • the work-sample rubric's EXPECTED probe answers (judge the defense)
//   • adaptive skill coverage from the role skill map (go deeper / move on /
//     prioritise unassessed must-haves before time runs out)
async function contentContext(interviewId: string, isWork: boolean, answers: { questionText: string; score: number }[], currentText: string, timeLeftSec: number | null) {
  const iv = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { position: { select: { title: true, techStack: true, mustHaves: true, agencyId: true, workSampleTask: true, rubricSelection: true } }, workSample: { select: { task: true } } },
  })
  if (!iv) return { block: '', coverage: null as SkillCoverage | null }
  const parts: string[] = []
  if (isWork) {
    const task = sanitizeTask(iv.workSample?.task ?? iv.position.workSampleTask)
    const rubric = sanitizeRubric(task?.rubric ?? {})
    if (rubric.probes.length) {
      parts.push('RUBRIC — EXPECTED ANSWERS TO LIKELY PROBES (interviewer-only; never reveal or hint at them). Pick the probe that best fits what the candidate actually did, ask it in your own words anchored in their code, and JUDGE their answer against the strong answer / weak signals:\n' +
        rubric.probes.map((p) => `- Decision: ${p.decision}\n  Ask: ${p.question}\n  Strong answer: ${p.strongAnswer}${p.weakSignals ? `\n  Weak signals: ${p.weakSignals}` : ''}`).join('\n'))
    }
    if (rubric.criteria.length) parts.push('RUBRIC CRITERIA (strong vs weak):\n' + rubric.criteria.map((c) => `- ${c.dimension}: strong = ${c.strong}; weak = ${c.weak}`).join('\n'))
  }
  const { skills: roleSkills } = await skillMapForPosition(iv.position.agencyId, iv.position.title, iv.position.techStack)
  // Rubric library selection joins the coverage engine: must-have rubrics are
  // must-haves (assess before time runs out); good-to-haves next; add-ons last.
  const rubricSel = readSelection(iv.position.rubricSelection)
  const skills = [...roleSkills, ...rubricSkillNodes(rubricSel)]
  let coverage: SkillCoverage | null = null
  if (skills.length) {
    const must = new Set([...Array.from(matchSkills(iv.position.mustHaves, roleSkills)), ...Array.from(mustRubricIds(rubricSel))])
    coverage = computeCoverage(skills, answers, must, { workSkills: isWork ? sanitizeTask(iv.workSample?.task ?? iv.position.workSampleTask)?.skills : [] })
    const g = coverageGuidance(skills, coverage, currentText, timeLeftSec)
    if (g) parts.push('ADAPTIVE COVERAGE (role skill map + selected rubrics):\n' + g)
    const t = rubricSel.length ? rubricTierGuidance(rubricSel, coverage, timeLeftSec) : ''
    if (t) parts.push('RUBRIC TIERS (recruiter-selected):\n' + t)
  }
  return { block: parts.length ? '\n\n' + parts.join('\n\n') : '', coverage }
}

// Hard cap on follow-ups per question (Build I-P0-3, Part 3a). The client enforces
// this too; we tell the model so it stops drilling and advances gracefully.
const MAX_FOLLOWUPS = 3

// Brain failures must be LOUD, never a silent "score 5, move on" (that hid an
// out-of-credits Anthropic account for a whole interview). Transient errors get
// one retry; anything else is reported as degraded so the room can probe instead
// of accepting the answer, and the Control Room shows it.
function classifyBrainError(err: unknown): { reason: string; retryable: boolean; status: number | null } {
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : null
  const msg = err instanceof Error ? err.message : String(err)
  if (/credit balance is too low|billing/i.test(msg)) return { reason: 'billing', retryable: false, status }
  if (status === 401 || status === 403) return { reason: 'auth', retryable: false, status }
  if (status === 429 || status === 529 || (status !== null && status >= 500) || /overloaded|timeout|ECONNRESET|fetch failed/i.test(msg)) return { reason: 'transient', retryable: true, status }
  if (err instanceof SyntaxError) return { reason: 'bad_json', retryable: true, status }
  return { reason: 'error', retryable: false, status }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const questionText: string            = body.questionText ?? ''
    const expectedKeyPoints: string[]     = body.expectedKeyPoints ?? []
    const candidateResponse: string       = body.candidateResponse ?? ''
    const previousResponses: Array<{ question: string; response: string }> = body.previousResponses ?? []
    const dynamicIntensity: string        = body.dynamicIntensity ?? 'standard'
    // How many follow-ups already asked on THIS question (Part 3a depth cap).
    const followUpCount: number           = Math.max(0, Number(body.followUpCount) || 0)
    const followUpsLeft                   = Math.max(0, MAX_FOLLOWUPS - followUpCount)
    // Recent interviewer lines — so phrasing can be varied, not repeated.
    const recentAiLines: string[] = Array.isArray(body.recentAiLines)
      ? body.recentAiLines.filter((l: unknown): l is string => typeof l === 'string').slice(-8).map((l: string) => l.slice(0, 200))
      : []
    // Observe & Defend: the candidate's ACTUAL work on a hands-on task (code,
    // test results, how the solution evolved). Present only for work-sample
    // questions; grounds the follow-ups — same budget, same engine.
    const wc = (body.workContext && typeof body.workContext === 'object' ? body.workContext : null) as Record<string, unknown> | null
    const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '')
    const workBlock = wc
      ? `\n\nWORK SAMPLE — the candidate just did this hands-on task; ground follow-ups in it:\n` +
        `TASK: ${clip(wc.task, 1500)}\n` +
        `LANGUAGE: ${clip(wc.language, 20)}\n` +
        `THEIR FINAL CODE:\n${clip(wc.code, 6000)}\n` +
        `TEST RESULTS: ${clip(wc.tests, 400) || 'not run'}\n` +
        `HOW THE WORK EVOLVED (timeline; moments M1…):\n${clip(wc.timeline, 2500)}\n` +
        (clip(wc.probeAngles, 800) ? `DECISION POINTS WORTH DEFENDING (interviewer-only): ${clip(wc.probeAngles, 800)}\n` : '')
      : ''

    // Rubric + coverage context (optional — older clients don't send interviewId).
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId.slice(0, 40) : ''
    const coverageAnswers = (Array.isArray(body.coverageAnswers) ? body.coverageAnswers : []).slice(-40)
      .filter((a: unknown): a is { questionText: string; score: number } => !!a && typeof (a as { questionText?: unknown }).questionText === 'string')
      .map((a: { questionText: string; score: number }) => ({ questionText: a.questionText.slice(0, 400), score: Math.max(0, Math.min(100, Number(a.score) || 0)) }))
    const timeLeftSec = Number.isFinite(Number(body.timeLeftSec)) ? Number(body.timeLeftSec) : null
    const ctx = interviewId
      ? await contentContext(interviewId, !!wc, coverageAnswers, `${questionText} ${candidateResponse}`.slice(0, 2000), timeLeftSec).catch((e) => { console.warn('[evaluate-response] content context failed:', e instanceof Error ? e.message : e); return { block: '', coverage: null } })
      : { block: '', coverage: null }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    // Real prior answers now flow in (the caller used to send empty responses).
    // Give the engine enough memory to reference what the candidate actually said.
    const prevCtx = previousResponses.length
      ? '\n\nEarlier in THIS interview (reference these — the candidate already said them):\n' +
        previousResponses.slice(-5).map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.response}`).join('\n')
      : ''

    // followUpsLeft === 0 → the depth cap is reached; force advance, no more drilling.
    const budgetLine = followUpsLeft === 0
      ? `FOLLOW-UP BUDGET: EXHAUSTED. You have already asked ${followUpCount} follow-ups on this question (cap is ${MAX_FOLLOWUPS}). You MUST set shouldAskFollowUp=false now and move on gracefully, even if the answer is unsatisfactory — record what is missing in keyPointsMissed and do NOT drill further.`
      : `FOLLOW-UP BUDGET: ${followUpsLeft} of ${MAX_FOLLOWUPS} follow-ups remain on this question. Only ask one if it is genuinely high-signal; otherwise advance. Never exceed the cap.`

    const callBrain = () => client.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 700,
      // NOTE: Opus 4.8 rejects temperature/top_p/top_k. Low effort keeps this
      // per-turn decision fast; thinking stays off (we demand JSON-only output).
      output_config: { effort: 'low' },
      system:
        `You are the decision engine for ${INTERVIEWER_NAME}, a professional AI interviewer.\n\n` +
        `ROLE: Evaluate candidate responses objectively and decide how ${INTERVIEWER_NAME} should proceed.\n` +
        'Only credit points the candidate explicitly mentioned — never infer or assume knowledge not demonstrated.\n' +
        'Keep evaluatorNote to 1-2 factual sentences only.\n\n' +
        `${INTERVIEWER_NAME.toUpperCase()}'S TONE RULES (apply to all generated text):\n` +
        '- NEVER use: "Great answer", "Excellent", "Perfect", "Wonderful", "Fantastic"\n' +
        '- ALWAYS use: "Thank you", "Understood", "Got it", "Noted", "That is helpful"\n' +
        '- Calm, warm, professional at all times — never make the candidate feel judged\n\n' +
        'FOLLOW-UP STRATEGY (Build I-P0-3) — you are on a strict budget (max ' + MAX_FOLLOWUPS + ' follow-ups per question):\n' +
        '- Advance to the next question as soon as the competency is sufficiently evidenced, OR the candidate is clearly stuck and not progressing, OR the budget is exhausted — whichever comes first.\n' +
        '- When you DO follow up, spend it on the SINGLE highest-signal gap in the answer — the most important weakness, ambiguity, or unverified claim — not on whatever is easiest to ask. Do not re-ask what was already answered.\n' +
        '- Probe role-relevant EDGE CASES to test depth: for a coding/design answer, push on failure modes, error handling, scale, concurrency, or edge inputs; for a behavioural answer, push on trade-offs, what they would do differently, or how they handled conflict. Pick the one that most reveals the candidate\'s true depth.\n' +
        '- Do NOT accept a vague answer by drilling endlessly, and do NOT exceed the budget even if the answer is weak — record the gap in keyPointsMissed and move on.\n\n' +
        'FOLLOW-UP QUESTION PHRASING (when shouldAskFollowUp is true) — intents, NOT scripts:\n' +
        '- Strong answer → ask how it played out in practice, or what they would change in hindsight.\n' +
        '- Vague or incomplete → ask for one specific, concrete example.\n' +
        '- Edge-case probe → ask what happens under a specific failure, scale, or concurrency condition.\n' +
        '- Off-topic → acknowledge briefly and steer back to the specific aspect of the question.\n' +
        '- Candidate struggled → ease off gently (one simpler angle at most), never stack angles.\n' +
        '- VARY YOUR WORDING. Write each follow-up fresh, anchored in the candidate\'s actual words. Do NOT reuse openers or stock phrases that appear in the RECENT INTERVIEWER LINES below (e.g. if "walk me through" or "can you get more concrete" was used recently, phrase it differently). Variety of phrasing only — this does NOT change how many follow-ups you ask.\n\n' +
        'WORK-SAMPLE MODE (only when a WORK SAMPLE block is present):\n' +
        '- The candidate is explaining work they actually did. Every follow-up MUST be about THEIR code and process — never generic theory.\n' +
        '- Anchor in specifics: name a function/variable/line they wrote, a test that failed, or a moment from the timeline (e.g. "around 4:10 you rewrote most of it — what made you change approach?").\n' +
        '- Highest-signal targets: a design decision (data structure, complexity, edge-case policy), an edge case their code mishandles or a failing test, a mid-way approach change, a large paste (ask them to explain that block line by line), what they would change with more time.\n' +
        '- You are testing judgment, critical thinking and how well they DEFEND decisions. Same budget rules apply.\n\n' +
        'CONFIRM-BACK (active mirroring):\n' +
        '- When the answer is SUBSTANTIVE (concrete content — a real example, design, decision, or reasoning; not a one-liner, "I don\'t know", or small talk), briefly restate its core in ONE natural sentence so the candidate feels heard, e.g. "So you sharded by tenant and moved hot keys to a separate cache — got it."\n' +
        '- If you ARE asking a follow-up, open followUpQuestion with that one-sentence restatement, then ask.\n' +
        '- If you are NOT asking a follow-up, put the restatement in confirmBack (it is spoken before moving on).\n' +
        '- For non-substantive answers, set confirmBack to "" and do not restate. Never restate on every turn; never sound robotic; never praise ("great answer") or judge; vary the opener ("So…", "If I\'ve got that right…", "Okay — …").\n\n' +
        (audioTagsOn() ? TAG_GUIDANCE : '') +
        'RELEVANCE SCORE (relevanceScore 0-10) — how well the response addresses the question:\n' +
        '- 9-10: Directly and comprehensively addresses the question asked\n' +
        '- 7-8: Mostly relevant with only minor tangents\n' +
        '- 5-6: Partially relevant — touches the topic but misses key aspects\n' +
        '- 3-4: Mostly off-topic, only superficially related to the question\n' +
        '- 0-2: Completely irrelevant or does not address the question at all\n\n' +
        'Return ONLY valid JSON — no markdown, no explanation, no preamble.',
      messages: [{
        role: 'user',
        content:
          `Question: "${questionText}"\n` +
          `Expected key points: ${expectedKeyPoints.join(', ')}\n` +
          `Candidate response: "${candidateResponse}"\n` +
          `Dynamic intensity: ${dynamicIntensity}\n` +
          `${budgetLine}${prevCtx}${workBlock}${ctx.block}` +
          (recentAiLines.length ? `\n\nRECENT INTERVIEWER LINES (do not repeat their phrasing):\n${recentAiLines.map((l) => `- ${l}`).join('\n')}` : '') +
          `\n\n` +
          `Return ONLY this JSON:\n` +
          `{\n` +
          `  "score": <integer 0-10>,\n` +
          `  "relevanceScore": <integer 0-10>,\n` +
          `  "keyPointsCovered": ["point1"],\n` +
          `  "keyPointsMissed": ["point2"],\n` +
          `  "evaluatorNote": "1-2 sentences",\n` +
          `  "shouldAskFollowUp": true|false,\n` +
          `  "followUpQuestion": "optional — only if shouldAskFollowUp is true",\n` +
          `  "generateDynamic": true|false,\n` +
          `  "suggestedTransition": "brief neutral phrase before moving on",\n` +
          `  "confirmBack": "one-sentence restatement of a substantive answer when NOT following up, else empty string"\n` +
          `}`,
      }],
    })

    let result: Record<string, unknown> | null = null
    const brainT0 = Date.now()
    let attempts = 0
    for (let attempt = 1; attempt <= 2 && !result; attempt++) {
      attempts = attempt
      try {
        const res = await callBrain()
        const raw   = res.content[0]?.type === 'text' ? res.content[0].text : '{}'
        const clean = raw.replace(/```json|```/g, '').trim()
        result = JSON.parse(clean) as Record<string, unknown>
      } catch (e) {
        const c = classifyBrainError(e)
        if (attempt === 1 && c.retryable) { await new Promise((r) => setTimeout(r, 600)); continue }
        throw e
      }
    }
    if (!result) throw new Error('brain returned no result')
    // Latency telemetry (pairs with the room's turn_timing line).
    console.info(JSON.stringify({ evt: 'brain_turn', model: INTERVIEW_MODEL, ms: Date.now() - brainT0, attempts, interviewId: interviewId || null }))
    // Delivery tags never reach the transcript/report: the fields stay clean and
    // a tagged copy (≤1 tag) goes in `speech` for the voice only.
    const speech: Record<string, string> = {}
    for (const f of ['followUpQuestion', 'confirmBack'] as const) {
      const v = result[f]
      if (typeof v !== 'string') continue
      if (audioTagsOn()) speech[f] = limitAudioTags(v, 1)
      result[f] = stripAudioTags(v)
    }

    // Between-question adaptation: the room promotes a question covering an
    // unassessed must-have. Only skill names/aliases — no rubric content.
    return NextResponse.json({
      ...result,
      ...(Object.keys(speech).length ? { speech } : {}),
      ...(ctx.coverage ? { coverage: { uncoveredKeys: ctx.coverage.uncoveredKeys, uncoveredMustHaves: ctx.coverage.uncoveredMustHaves.map((u) => u.name) } } : {}),
    }, { status: 200 })
  } catch (err: unknown) {
    const c = classifyBrainError(err)
    // LOUD: one structured line ops can alert on (e.g. evt=brain_unavailable reason=billing).
    console.error(JSON.stringify({ evt: 'brain_unavailable', route: 'evaluate-response', reason: c.reason, status: c.status, model: INTERVIEW_MODEL, detail: (err instanceof Error ? err.message : String(err)).slice(0, 300) }))
    // Still 200 so the interview doesn't crash — but flagged `degraded`, so the
    // room probes trivial answers instead of accepting them and the Control Room
    // shows that answers are not being evaluated.
    return NextResponse.json({
      degraded: true,
      degradedReason: c.reason,
      score: 5,
      relevanceScore: 5,
      keyPointsCovered: [],
      keyPointsMissed: [],
      evaluatorNote: 'Not evaluated live — the AI evaluator was unavailable.',
      shouldAskFollowUp: false,
      generateDynamic: false,
      suggestedTransition: 'Thank you.',
    }, { status: 200 })
  }
}
