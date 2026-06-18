import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDemoPersona } from '@/lib/screen/demo/personas'

export const dynamic = 'force-dynamic'

// ── One-click demo launch (Build 05) ───────────────────────────────────────
// No login, no JD entry. Spins up a fully-tagged isDemo Position + pre-approved
// QuestionSet + anonymous Candidate + Interview, then returns the interviewId so
// the gallery can drop the prospect straight into the live voice interview.
//
// Isolation: all demo data lives under a dedicated DEMO agency, so it never
// appears in any real customer's analytics/review queue, and (being anonymous)
// it never touches the authenticated billing/usage counters. The isDemo flags
// are belt-and-suspenders on top of that.

const DEMO_AGENCY_NAME = '__Levl1 Demo__'

// Simple per-IP rate limit to prevent demo-start abuse.
const hits = new Map<string, number[]>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 6 // max 6 demo starts / minute / IP
}

async function getDemoAgencyId(): Promise<string> {
  const existing = await prisma.agency.findFirst({ where: { name: DEMO_AGENCY_NAME }, select: { id: true } })
  if (existing) return existing.id
  const created = await prisma.agency.create({ data: { name: DEMO_AGENCY_NAME } })
  return created.id
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    if (rateLimited(ip)) return NextResponse.json({ error: 'Too many demo starts — please try again in a minute.' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const persona = getDemoPersona(String(body.slug ?? ''))
    if (!persona) return NextResponse.json({ error: 'Unknown demo persona' }, { status: 404 })

    const agencyId = await getDemoAgencyId()

    // Fresh, isolated demo Position with the SHORT demo duration (decoupled from
    // the 30-min production envelope) and pre-approved status (single-approver
    // default already satisfied for demos).
    const position = await prisma.position.create({
      data: {
        agencyId, isDemo: true,
        title: persona.title, company: 'Levl1 Demo', experienceLevel: 'mid',
        roleType: 'IC', techStack: persona.skills, status: 'active',
        interviewDuration: persona.durationMin, voiceAccent: 'neutral',
        jdText: persona.jdText, jdSource: 'generated',
        techLeadApproved: true, hrApproved: true, rubricApproved: true,
      },
    })

    await prisma.questionSet.create({
      data: {
        positionId: position.id,
        technicalQuestions: persona.questions.technical as never,
        scenarioQuestions: persona.questions.scenario as never,
        behavioralQuestions: persona.questions.behavioral as never,
        eqQuestions: persona.questions.eq as never,
        whiteboardQuestions: persona.questions.whiteboard as never,
        timeAllocation: { totalMinutes: persona.durationMin } as never,
      },
    })

    const candidate = await prisma.candidate.create({
      data: { name: 'Demo Candidate', email: `demo+${position.id}@levl1.demo`, positionId: position.id, isDemo: true, topSkills: persona.skills, status: 'pending' },
    })

    const interview = await prisma.interview.create({
      data: { candidateId: candidate.id, positionId: position.id, isDemo: true, status: 'scheduled', duration: persona.durationMin, consentGiven: true, consentGivenAt: new Date() },
    })
    await prisma.interviewToken.create({ data: { interviewId: interview.id, expiresAt: new Date(Date.now() + 2 * 3600_000) } })

    console.log('[demo/start] persona=%s interview=%s (isDemo)', persona.slug, interview.id)
    return NextResponse.json({ interviewId: interview.id, durationMin: persona.durationMin })
  } catch (err) {
    console.error('[demo/start] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the demo — please try again.' }, { status: 500 })
  }
}
