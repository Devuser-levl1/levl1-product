import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDemoPersona } from '@/lib/screen/demo/personas'
import { demoWorkSample } from '@/lib/screen/demo/work-sample'
import { DEFAULT_VOICE_KEY } from '@/lib/voiceOptions'
import { sweepStaleDemoData } from '@/lib/screen/demo/cleanup'
import { normalizeEmail, businessEmailError } from '@/lib/screen/auth/email'
import { getDemoAgencyId, notifySales, checkDemoRate, recordDemoStart, requestIp } from '@/lib/screen/demo/lead'

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

export async function POST(req: NextRequest) {
  try {
    const ip = requestIp(req)
    const rate = checkDemoRate(ip)
    if (!rate.ok) return NextResponse.json({ error: rate.message, limit: rate.reason, bookACall: true }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const persona = getDemoPersona(String(body.slug ?? ''))
    if (!persona) return NextResponse.json({ error: 'Unknown demo persona' }, { status: 404 })

    // Lead capture (gate): require a name + business email before starting.
    const name = String(body.name ?? '').trim()
    const email = normalizeEmail(body.email)
    const marketingConsent = body.marketingConsent === true
    if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    const emailErr = businessEmailError(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })

    // Safety net: demo data is ephemeral — purge anything stale before creating more.
    await sweepStaleDemoData().catch(() => {})

    const agencyId = await getDemoAgencyId()

    // Fresh, isolated demo Position with the SHORT demo duration (decoupled from
    // the 30-min production envelope) and pre-approved status (single-approver
    // default already satisfied for demos). Same room + engine as a real
    // interview: technical mode + an approved work sample → the Monaco + Judge0
    // IDE and observe-and-defend run exactly as in production.
    const workSample = demoWorkSample(persona)
    const position = await prisma.position.create({
      data: {
        agencyId, isDemo: true,
        title: persona.title, company: 'Levl1 Demo', experienceLevel: 'mid',
        roleType: 'IC', techStack: persona.skills, status: 'active',
        interviewDuration: persona.durationMin,
        // The default interviewer (Ananya) — was 'neutral', which isn't a voice key.
        voiceAccent: DEFAULT_VOICE_KEY,
        ...(workSample ? { interviewMode: 'technical', workSampleTask: workSample as never } : {}),
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

    // Use the captured lead identity on the (ephemeral) demo candidate.
    const candidate = await prisma.candidate.create({
      data: { name, email, positionId: position.id, isDemo: true, topSkills: persona.skills, status: 'pending' },
    })

    // Consent is NOT pre-filled: the prospect sees the same consent + capture
    // notice in the room as a real candidate (both are recorded in the audit log).
    const interview = await prisma.interview.create({
      data: { candidateId: candidate.id, positionId: position.id, isDemo: true, status: 'scheduled', duration: persona.durationMin },
    })
    await prisma.interviewToken.create({ data: { interviewId: interview.id, expiresAt: new Date(Date.now() + 2 * 3600_000) } })

    // Persist the LEAD (sales artifact) — survives the ephemeral demo cleanup.
    await prisma.demoLead.create({ data: { name, email, personaSlug: persona.slug, marketingConsent, interviewId: interview.id, requestIp: ip } }).catch((e) => console.error('[demo/start] lead capture failed:', e instanceof Error ? e.message : e))
    // Notify sales (fire-and-forget — never blocks the demo).
    notifySales({ name, email, roleTitle: persona.title, marketingConsent, product: 'Screen' }).catch((e) => console.error('[demo/start] sales notify failed:', e instanceof Error ? e.message : e))

    recordDemoStart(ip)  // count only successful starts toward the (shared) rate limit
    console.log('[demo/start] lead=%s persona=%s interview=%s', email, persona.slug, interview.id)
    return NextResponse.json({ interviewId: interview.id, durationMin: persona.durationMin })
  } catch (err) {
    console.error('[demo/start] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the demo — please try again.' }, { status: 500 })
  }
}
