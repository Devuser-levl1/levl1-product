import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueue } from '@/lib/hire/jobs/queue'
import { JOB_NAME } from '@/lib/hire/jobs/score-candidate'
import { sendHireEmail } from '@/lib/hire/email'
import { applicationReceivedCandidateEmail, newApplicationRecruiterEmail } from '@/emails/hire/application-received'

export const dynamic = 'force-dynamic'

// Basic per-IP throttle for public submissions (in-memory, single instance).
const applyHits = new Map<string, number[]>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (applyHits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  applyHits.set(ip, recent)
  return recent.length > 5 // max 5 applications / minute / IP
}

// Public — fetch the job for the apply page.
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const job = await prisma.hireJob.findUnique({
    where: { applySlug: params.slug },
    include: { tenant: { select: { name: true, logoUrl: true } } },
  })
  if (!job || job.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'This job is not accepting applications' }, { status: 404 })
  }
  return NextResponse.json({
    title: job.title,
    description: job.description,
    location: job.location,
    department: job.department,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    company: job.tenant.name,
    logoUrl: job.tenant.logoUrl,
  })
}

// Public — submit an application.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    if (rateLimited(ip)) return NextResponse.json({ error: 'Too many applications — please try again in a minute.' }, { status: 429 })

    const job = await prisma.hireJob.findUnique({ where: { applySlug: params.slug }, include: { tenant: true } })
    if (!job || job.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This job is not accepting applications' }, { status: 404 })
    }

    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })

    const stages = Array.isArray(job.stages) ? (job.stages as string[]) : []
    const firstStage = stages[0] ?? 'Sourced'

    const candidate = await prisma.hireCandidate.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        name,
        email,
        phone: body.phone ? String(body.phone) : null,
        resumeText: body.resumeText ? String(body.resumeText) : null,
        currentStage: firstStage,
        source: 'Direct',
      },
    })

    await prisma.hireCandidateActivity.create({
      data: { candidateId: candidate.id, type: 'note', note: `Applied via public page${body.currentRole ? ` · ${body.currentRole}` : ''}` },
    })

    // Queue AI scoring (best-effort — must not block the response).
    if (candidate.resumeText) {
      enqueue(JOB_NAME, { candidateId: candidate.id }).catch((e) => console.error('[hire/apply] enqueue failed:', e))
    }

    // Confirmation + recruiter notification emails (best-effort).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
    sendHireEmail({
      to: email,
      subject: `We received your application for ${job.title}`,
      html: applicationReceivedCandidateEmail({ candidateName: name, jobTitle: job.title, company: job.tenant.name }),
    }).catch((e) => console.error('[hire/apply] candidate email failed:', e))

    prisma.hireUser.findFirst({ where: { tenantId: job.tenantId }, orderBy: { createdAt: 'asc' } }).then((recruiter) => {
      if (recruiter) {
        return sendHireEmail({
          to: recruiter.email,
          subject: `New application: ${name} for ${job.title}`,
          html: newApplicationRecruiterEmail({ recruiterName: recruiter.name, candidateName: name, jobTitle: job.title, appUrl, jobId: job.id }),
        })
      }
    }).catch((e) => console.error('[hire/apply] recruiter email failed:', e))

    return NextResponse.json({ ok: true, candidateId: candidate.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Application failed'
    console.error('[hire/apply] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
