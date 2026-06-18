import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDemoPersona } from '@/lib/screen/demo/personas'
import { sweepStaleDemoData } from '@/lib/screen/demo/cleanup'
import { normalizeEmail, businessEmailError } from '@/lib/screen/auth/email'
import { sendEmail } from '@/lib/emailService'

const LEADS_EMAIL = process.env.DEMO_LEADS_EMAIL ?? 'sales@levl1.io'

// Notify sales of a new demo lead (fire-and-forget; never blocks the demo).
async function notifySales(lead: { name: string; email: string; personaSlug: string; marketingConsent: boolean }) {
  const roleTitle = getDemoPersona(lead.personaSlug)?.title ?? lead.personaSlug
  await sendEmail({
    to: LEADS_EMAIL,
    replyTo: lead.email,
    subject: `New demo lead: ${lead.name} — ${roleTitle}`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;color:#0F172A;line-height:1.7">
      <div style="font-size:16px;font-weight:800;color:#4F46E5;margin-bottom:10px">New Levl1 demo lead</div>
      <table style="border-collapse:collapse">
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Name</td><td><strong>${lead.name}</strong></td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Work email</td><td><a href="mailto:${lead.email}">${lead.email}</a></td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Tried role</td><td>${roleTitle}</td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Marketing consent</td><td>${lead.marketingConsent ? '✅ opted in' : '— not opted in'}</td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">When</td><td>${new Date().toUTCString()}</td></tr>
      </table>
      <p style="color:#94A3B8;font-size:12px;margin-top:16px">Reply to this email to reach the prospect directly.</p>
    </div>`,
  })
}

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

// Rate limiting (G5) — protects against abuse + runaway voice/LLM cost (still on
// the pricier ElevenLabs path until the Sarvam swap). Two layers, both env-tunable:
//   DEMO_RATE_LIMIT_PER_IP  — demo starts per IP per 24h (default 3)
//   DEMO_GLOBAL_DAILY_CAP   — global circuit-breaker per 24h (default 200)
// Counts only SUCCESSFUL starts so failed attempts don't burn a prospect's quota.
const DAY_MS = 24 * 60 * 60 * 1000
const PER_IP_LIMIT = Math.max(1, Number(process.env.DEMO_RATE_LIMIT_PER_IP ?? 3))
const GLOBAL_DAILY_CAP = Math.max(1, Number(process.env.DEMO_GLOBAL_DAILY_CAP ?? 200))
const ipHits = new Map<string, number[]>()
let globalHits: number[] = []

function checkRate(ip: string): { ok: true } | { ok: false; reason: 'ip' | 'global' } {
  const now = Date.now()
  globalHits = globalHits.filter((t) => now - t < DAY_MS)
  if (globalHits.length >= GLOBAL_DAILY_CAP) return { ok: false, reason: 'global' }
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < DAY_MS)
  if (recent.length >= PER_IP_LIMIT) return { ok: false, reason: 'ip' }
  return { ok: true }
}
function recordStart(ip: string) {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < DAY_MS)
  recent.push(now); ipHits.set(ip, recent)
  globalHits.push(now)
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
    const rate = checkRate(ip)
    if (!rate.ok) {
      const msg = rate.reason === 'global'
        ? 'Our live demo is at capacity right now — book a quick call and we\'ll walk you through it.'
        : 'You\'ve reached the demo limit for now — book a call and we\'ll give you full access.'
      return NextResponse.json({ error: msg, limit: rate.reason, bookACall: true }, { status: 429 })
    }

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

    // Use the captured lead identity on the (ephemeral) demo candidate.
    const candidate = await prisma.candidate.create({
      data: { name, email, positionId: position.id, isDemo: true, topSkills: persona.skills, status: 'pending' },
    })

    const interview = await prisma.interview.create({
      data: { candidateId: candidate.id, positionId: position.id, isDemo: true, status: 'scheduled', duration: persona.durationMin, consentGiven: true, consentGivenAt: new Date() },
    })
    await prisma.interviewToken.create({ data: { interviewId: interview.id, expiresAt: new Date(Date.now() + 2 * 3600_000) } })

    // Persist the LEAD (sales artifact) — survives the ephemeral demo cleanup.
    await prisma.demoLead.create({ data: { name, email, personaSlug: persona.slug, marketingConsent, interviewId: interview.id, requestIp: ip } }).catch((e) => console.error('[demo/start] lead capture failed:', e instanceof Error ? e.message : e))
    // Notify sales (fire-and-forget — never blocks the demo).
    notifySales({ name, email, personaSlug: persona.slug, marketingConsent }).catch((e) => console.error('[demo/start] sales notify failed:', e instanceof Error ? e.message : e))

    recordStart(ip)  // count only successful starts toward the rate limit
    console.log('[demo/start] lead=%s persona=%s interview=%s', email, persona.slug, interview.id)
    return NextResponse.json({ interviewId: interview.id, durationMin: persona.durationMin })
  } catch (err) {
    console.error('[demo/start] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the demo — please try again.' }, { status: 500 })
  }
}
