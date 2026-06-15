import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '@prisma/client'
import { CLAUDE_MODEL } from '@/lib/ai/model'

// ── Interviews-owned question generation (Phase 1) ─────────────────────────
// Self-contained copy of the generation logic so the public path never imports
// lib/hire/*. For API-originated interviews there is no human in the loop, so
// the set is auto-approved (Position → active) — matching prior behaviour.

export type QSet = { technicalQuestions: Prisma.InputJsonValue; scenarioQuestions: Prisma.InputJsonValue; behavioralQuestions: Prisma.InputJsonValue; eqQuestions: Prisma.InputJsonValue; whiteboardQuestions: Prisma.InputJsonValue; timeAllocation: Prisma.InputJsonValue }

function defaultQuestions(title: string): QSet {
  const q = (question: string) => ({ question, expectedKeyPoints: [] })
  return {
    technicalQuestions: [q(`Walk me through your most relevant experience for a ${title} role.`), q('Describe a technically challenging problem you solved recently.')],
    scenarioQuestions: [q('How would you approach a project with unclear requirements and a tight deadline?')],
    behavioralQuestions: [q('Tell me about a time you influenced a decision without authority.')],
    eqQuestions: [q('How do you handle disagreement with a teammate on technical direction?')],
    whiteboardQuestions: [],
    timeAllocation: { technical: 12, scenario: 8, behavioral: 6, eq: 4 },
  }
}

export async function generateQuestionSet(title: string, jd: string): Promise<QSet> {
  if (!process.env.ANTHROPIC_API_KEY) return defaultQuestions(title)
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: CLAUDE_MODEL, max_tokens: 1600, temperature: 0.3,
      messages: [{ role: 'user', content: `Generate interview questions for "${title}". JD: ${jd.slice(0, 1500)}.
Return ONLY JSON: {"technicalQuestions":[{"question":"..","expectedKeyPoints":[".."]}],"scenarioQuestions":[...],"behavioralQuestions":[...],"eqQuestions":[...]}
6-7 technical, 2-3 each for scenario / behavioral / eq.` }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return {
      technicalQuestions: parsed.technicalQuestions ?? [],
      scenarioQuestions: parsed.scenarioQuestions ?? [],
      behavioralQuestions: parsed.behavioralQuestions ?? [],
      eqQuestions: parsed.eqQuestions ?? [],
      whiteboardQuestions: [],
      timeAllocation: { technical: 12, scenario: 8, behavioral: 6, eq: 4 },
    }
  } catch (e) {
    console.error('[interviews/questions] gen failed, using defaults:', e)
    return defaultQuestions(title)
  }
}

/** Auto-approve a Position's question set for API-originated interviews. */
export async function autoApproveQuestionSet(positionId: string, title: string, jd: string): Promise<void> {
  const position = await prisma.position.findUnique({ where: { id: positionId }, include: { questionSet: true } })
  if (position?.questionSet && position.techLeadApproved && position.hrApproved) return
  const qs = await generateQuestionSet(title, jd)
  await prisma.questionSet.upsert({ where: { positionId }, update: qs, create: { positionId, ...qs } })
  await prisma.position.update({ where: { id: positionId }, data: { techLeadApproved: true, hrApproved: true, status: 'active' } })
}
