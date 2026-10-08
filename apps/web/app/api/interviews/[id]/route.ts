import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { effectiveInterviewMinutes } from '@/lib/screen/session/duration'
import { getSessionFromRequest } from '@/lib/auth'
import { TERMINATION_REASONS } from '@/lib/screen/session/lifecycle'

export const dynamic = 'force-dynamic'

// This route is shared by two audiences:
//   • the CANDIDATE (interview room + slot-booking page) — no session, holds
//     only the interview link. Gets a minimal projection and may only advance
//     the session lifecycle (start → complete).
//   • RECRUITERS (signed in) — full record, but only for their own agency.

// What the candidate-facing pages read. No resume, transcript, scores,
// rubric, question bank, or approver emails.
const PUBLIC_SELECT = {
  id: true, candidateId: true, positionId: true, status: true, isDemo: true,
  scheduledAt: true, startedAt: true, completedAt: true, duration: true,
  agentOnline: true, candidateJoined: true, consentGiven: true, createdAt: true,
  candidate: { select: { id: true, name: true, email: true, status: true, topSkills: true, uploadedAt: true } },
  position: {
    select: {
      id: true, title: true, company: true, department: true, experienceLevel: true, techStack: true,
      status: true, createdAt: true, techLeadApproved: true, hrApproved: true, interviewDuration: true,
      agency: { select: { id: true, name: true, logoUrl: true } },
    },
  },
} satisfies Prisma.InterviewSelect

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (session) {
      const interview = await prisma.interview.findFirst({
        where: { id: params.id, position: { agencyId: session.agencyId } },
        include: {
          candidate: {
            select: { id: true, name: true, email: true, status: true, topSkills: true, uploadedAt: true, resumeText: true, currentTitle: true, currentCompany: true },
          },
          position: {
            include: {
              questionSet: true,
              agency: { select: { id: true, name: true, logoUrl: true } },
            },
          },
        },
      })
      if (interview) return NextResponse.json(withEffectiveDuration(interview))
      // Signed-in users can also be candidates opening their own link (or a
      // demo run) — fall through to the public projection.
    }
    const interview = await prisma.interview.findUnique({ where: { id: params.id }, select: PUBLIC_SELECT })
    if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(withEffectiveDuration(interview))
  } catch (err) {
    console.error('GET /api/interviews/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch interview' }, { status: 500 })
  }
}

// The interview room's timer + start screen read these — serve the length the
// session will actually run (production envelope; demos keep their own).
function withEffectiveDuration<T extends { isDemo: boolean; duration: number; position: { interviewDuration: number } }>(iv: T): T {
  const minutes = effectiveInterviewMinutes({ isDemo: iv.isDemo, interviewDuration: iv.position.interviewDuration })
  return { ...iv, duration: minutes, position: { ...iv.position, interviewDuration: minutes } }
}

const TERMINATIONS = new Set<string>(Object.values(TERMINATION_REASONS))
const RECRUITER_STATUSES = new Set(['scheduled', 'in_progress', 'completed', 'cancelled', 'expired', 'no_show'])

const isoDate = (v: unknown) => (typeof v === 'string' && !isNaN(Date.parse(v)) ? new Date(v) : undefined)

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const session = getSessionFromRequest(req)

    const current = await prisma.interview.findUnique({
      where: { id: params.id },
      select: { status: true, position: { select: { agencyId: true } } },
    })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isRecruiter = !!session && current.position.agencyId === session.agencyId

    // Lifecycle fields the candidate's interview room writes.
    const data: Prisma.InterviewUpdateInput = {}
    if (typeof body.status === 'string') {
      if (isRecruiter ? RECRUITER_STATUSES.has(body.status) : candidateTransitionOk(current.status, body.status)) {
        data.status = body.status
      } else {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
      }
    }
    if (body.startedAt !== undefined) data.startedAt = isoDate(body.startedAt)
    if (body.completedAt !== undefined) data.completedAt = isoDate(body.completedAt)
    if (body.consentWithdrawnAt !== undefined) data.consentWithdrawnAt = isoDate(body.consentWithdrawnAt)
    if (typeof body.terminationReason === 'string' && TERMINATIONS.has(body.terminationReason)) data.terminationReason = body.terminationReason
    if (typeof body.candidateJoined === 'boolean') data.candidateJoined = body.candidateJoined

    // Recruiter-only fields.
    if (isRecruiter) {
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt === null ? null : isoDate(body.scheduledAt)
      if (typeof body.duration === 'number' && body.duration > 0) data.duration = Math.round(body.duration)
      if (typeof body.agentOnline === 'boolean') data.agentOnline = body.agentOnline
    }

    const interview = await prisma.interview.update({
      where: { id: params.id },
      data,
      select: { id: true, status: true, startedAt: true, completedAt: true, terminationReason: true },
    })
    return NextResponse.json(interview)
  } catch (err) {
    console.error('PATCH /api/interviews/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 })
  }
}

// A candidate can only move their session forward: start it, then finish it.
// A completed session can't be reopened from the candidate side.
function candidateTransitionOk(from: string, to: string): boolean {
  if (to === from) return true
  if (to === 'in_progress') return from === 'scheduled' || from === 'pending' || from === 'invited'
  if (to === 'completed') return from !== 'completed'
  return false
}
