import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { INTERVIEW_MODEL } from '@/lib/screen/interview/model'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

// Hard cap on follow-ups per question (Build I-P0-3, Part 3a). The client enforces
// this too; we tell the model so it stops drilling and advances gracefully.
const MAX_FOLLOWUPS = 3

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

    const res = await client.messages.create({
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
        'CONFIRM-BACK (active mirroring):\n' +
        '- When the answer is SUBSTANTIVE (concrete content — a real example, design, decision, or reasoning; not a one-liner, "I don\'t know", or small talk), briefly restate its core in ONE natural sentence so the candidate feels heard, e.g. "So you sharded by tenant and moved hot keys to a separate cache — got it."\n' +
        '- If you ARE asking a follow-up, open followUpQuestion with that one-sentence restatement, then ask.\n' +
        '- If you are NOT asking a follow-up, put the restatement in confirmBack (it is spoken before moving on).\n' +
        '- For non-substantive answers, set confirmBack to "" and do not restate. Never restate on every turn; never sound robotic; never praise ("great answer") or judge; vary the opener ("So…", "If I\'ve got that right…", "Okay — …").\n\n' +
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
          `${budgetLine}${prevCtx}` +
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

    const raw   = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    console.error('evaluate-response error:', err instanceof Error ? err.message : err)
    // Return a safe fallback so the interview doesn't crash
    return NextResponse.json({
      score: 5,
      relevanceScore: 5,
      keyPointsCovered: [],
      keyPointsMissed: [],
      evaluatorNote: 'Evaluation unavailable.',
      shouldAskFollowUp: false,
      generateDynamic: false,
      suggestedTransition: 'Thank you.',
    }, { status: 200 })
  }
}
