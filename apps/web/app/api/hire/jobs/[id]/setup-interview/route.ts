import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ensureInterviewPosition } from '@/lib/hire/interviews-bridge'
import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Quick setup: generate an approved question set for the mapped Interviews
// Position so AI interviews can run. (The full generate/approve flow is also
// available in the Interviews product at /positions/[positionId].)
export const POST = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const positionId = await ensureInterviewPosition(job.id, ctx.tenantId)
  const position = await prisma.position.findUnique({ where: { id: positionId }, include: { questionSet: true } })
  if (position?.questionSet && position.techLeadApproved && position.hrApproved) {
    return NextResponse.json({ positionId, ready: true })
  }

  let qs = defaultQuestions(job.title)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      qs = await generateQuestions(job.title, job.description)
    } catch (e) {
      console.error('[setup-interview] AI gen failed, using defaults:', e)
    }
  }

  await prisma.questionSet.upsert({
    where: { positionId },
    update: qs,
    create: { positionId, ...qs },
  })
  await prisma.position.update({
    where: { id: positionId },
    data: { techLeadApproved: true, hrApproved: true, status: 'active' },
  })

  return NextResponse.json({ positionId, ready: true })
})

type QSet = { technicalQuestions: Prisma.InputJsonValue; scenarioQuestions: Prisma.InputJsonValue; behavioralQuestions: Prisma.InputJsonValue; eqQuestions: Prisma.InputJsonValue; whiteboardQuestions: Prisma.InputJsonValue; timeAllocation: Prisma.InputJsonValue }

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

async function generateQuestions(title: string, jd: string): Promise<QSet> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 1200, temperature: 0.3,
    messages: [{ role: 'user', content: `Generate interview questions for "${title}". JD: ${jd.slice(0, 1500)}.
Return ONLY JSON: {"technicalQuestions":[{"question":"..","expectedKeyPoints":[".."]}],"scenarioQuestions":[...],"behavioralQuestions":[...],"eqQuestions":[...]}
2-3 questions per section.` }],
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
}
