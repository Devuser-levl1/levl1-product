import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getDemoPersona } from '@/lib/screen/demo/personas'
import { demoWorkSample } from '@/lib/screen/demo/work-sample'
import { getDemoAgencyId, notifySales, checkDemoRate, recordDemoStart, requestIp } from '@/lib/screen/demo/lead'
import { normalizeEmail, businessEmailError } from '@/lib/screen/auth/email'
import { newToken, hashToken } from '@/lib/screen/solve/session'
import { DEMO_SOLVE_CONFIG, sweepStaleSolveDemos } from '@/lib/screen/solve/demo'
import { recordStageUsage } from '@/lib/screen/solve/usage'

export const dynamic = 'force-dynamic'

// ── One-click Solve demo ───────────────────────────────────────────────────
// POST { slug, name, email, marketingConsent } → { url: /solve/<token> }
// Creates a REAL take-home (isDemo) under the isolated demo agency: demo
// position + enabled assignment + demo candidate + submission. Same lead gate
// and SHARED rate limit as the Screen demo. See lib/screen/solve/demo.ts.
export async function POST(req: NextRequest) {
  try {
    const ip = requestIp(req)
    const rate = checkDemoRate(ip)
    if (!rate.ok) return NextResponse.json({ error: rate.message, limit: rate.reason, bookACall: true }, { status: 429 })

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const persona = getDemoPersona(String(body.slug ?? ''))
    const task = persona ? demoWorkSample(persona) : null
    if (!persona || !task) return NextResponse.json({ error: 'Unknown demo role' }, { status: 404 })
    const name = String(body.name ?? '').trim().slice(0, 120)
    const email = normalizeEmail(String(body.email ?? ""))
    const marketingConsent = body.marketingConsent === true
    if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    const emailErr = businessEmailError(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })

    await sweepStaleSolveDemos().catch(() => 0)
    const agencyId = await getDemoAgencyId()
    const cfg = DEMO_SOLVE_CONFIG
    const position = await prisma.position.create({
      data: {
        agencyId, isDemo: true, title: persona.title, company: 'Levl1 Demo', experienceLevel: 'mid', roleType: 'IC',
        techStack: persona.skills, status: 'active', jdText: persona.jdText, jdSource: 'generated',
        techLeadApproved: true, hrApproved: true, rubricApproved: true,
      },
    })
    const assignment = await prisma.solveAssignment.create({
      data: { positionId: position.id, agencyId, enabled: true, task: task as unknown as Prisma.InputJsonValue, config: cfg as unknown as Prisma.InputJsonValue, updatedBy: 'demo' },
    })
    const candidate = await prisma.candidate.create({ data: { name, email, positionId: position.id, isDemo: true, topSkills: persona.skills, status: 'pending' } })
    const token = newToken()
    const sub = await prisma.solveSubmission.create({
      data: {
        assignmentId: assignment.id, positionId: position.id, candidateId: candidate.id, agencyId, isDemo: true,
        tokenHash: hashToken(token), status: 'invited', task: task as unknown as Prisma.InputJsonValue, config: cfg as unknown as Prisma.InputJsonValue,
        invitedBy: 'demo', expiresAt: new Date(Date.now() + 2 * 3600_000), language: task.language,
      },
      select: { id: true },
    })
    await prisma.demoLead.create({ data: { name, email, personaSlug: `solve:${persona.slug}`, marketingConsent, requestIp: ip } }).catch((e) => console.error('[solve/demo] lead capture failed:', e instanceof Error ? e.message : e))
    notifySales({ name, email, roleTitle: persona.title, marketingConsent, product: 'Solve' }).catch((e) => console.error('[solve/demo] sales notify failed:', e instanceof Error ? e.message : e))
    await recordStageUsage({ agencyId, stage: 'solve', kind: 'solve_invite', refId: sub.id, isDemo: true })
    recordDemoStart(ip)
    console.info(JSON.stringify({ evt: 'solve_demo_started', persona: persona.slug, submissionId: sub.id }))
    return NextResponse.json({ url: `/solve/${token}?demo=1`, minutes: cfg.durationMinutes })
  } catch (err) {
    console.error('[solve/demo] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the demo — please try again.' }, { status: 500 })
  }
}
