import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { summarizeIntegrity } from '@/lib/screen/integrity/summary'
import { MUST_HAVE_LABEL, type MustHaveResult } from '@/lib/screen/recruiter/must-haves'

export const dynamic = 'force-dynamic'

// ── CSV export of interview results (Screen-scoped) ────────────────────────
// GET /api/reports/export?positionId=&from=YYYY-MM-DD&to=YYYY-MM-DD&recommendation=
// Completed interviews in the caller's agency only; demo rows always excluded.
// One query for interviews (+ report, culture fit) and one for integrity events.

const REC_LABEL: Record<string, string> = { strong_yes: 'Strong yes', yes: 'Yes', maybe: 'Maybe', no: 'No' }
const MAX_ROWS = 5000

export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const { agencyId } = access.session

  const q = new URL(req.url).searchParams
  const positionId = q.get('positionId') || undefined
  const from = parseDay(q.get('from'))
  const to = parseDay(q.get('to'), true)
  const recommendation = q.get('recommendation') || undefined

  const interviews = await prisma.interview.findMany({
    where: {
      position: { agencyId, isDemo: false },
      positionId,
      isDemo: false,
      candidate: { isDemo: false, ...(recommendation ? { report: { recommendation } } : {}) },
      status: 'completed',
      ...(from || to ? { completedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    select: {
      id: true, startedAt: true, completedAt: true, actualDuration: true, terminationReason: true,
      candidate: {
        select: {
          name: true, email: true,
          report: { select: { overallScore: true, recommendation: true, communication: true, insufficientEvidence: true, mustHaveAssessment: true } },
        },
      },
      position: { select: { title: true, company: true } },
      cultureFit: { select: { fitScore: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: MAX_ROWS,
  })

  const events = interviews.length
    ? await prisma.interviewIntegrityEvent.findMany({
        where: { interviewId: { in: interviews.map((i) => i.id) } },
        select: { interviewId: true, type: true, occurredAt: true, durationMs: true, confidence: true, detail: true, meta: true },
      })
    : []
  const eventsBy = new Map<string, typeof events>()
  for (const e of events) {
    const list = eventsBy.get(e.interviewId) ?? []
    list.push(e)
    eventsBy.set(e.interviewId, list)
  }

  const header = [
    'Candidate', 'Email', 'Position', 'Company', 'Interview date', 'Recommendation',
    'Competency score (0-100)', 'Communication score (0-100)', 'CEFR level', 'Culture-fit score (0-100)',
    'Integrity review', 'Integrity events', 'Must-haves met', 'Must-have detail', 'Duration (min)', 'Outcome',
  ]
  const rows = interviews.map((i) => {
    const r = i.candidate.report
    const integrity = summarizeIntegrity(eventsBy.get(i.id) ?? [])
    const comm = communicationScore(r?.communication)
    const mh = (Array.isArray(r?.mustHaveAssessment) ? r!.mustHaveAssessment : []) as unknown as MustHaveResult[]
    const date = i.startedAt ?? i.completedAt
    return [
      i.candidate.name,
      i.candidate.email,
      i.position.title,
      i.position.company,
      date ? date.toISOString().slice(0, 10) : '',
      !r ? 'Report pending' : r.insufficientEvidence ? 'Insufficient evidence' : REC_LABEL[r.recommendation] ?? r.recommendation,
      r && !r.insufficientEvidence ? r.overallScore : '',
      comm?.score ?? '',
      comm?.cefr ?? '',
      i.cultureFit?.fitScore ?? '',
      integrity.reviewStatus === 'FLAGGED_FOR_REVIEW' ? 'Flagged for review' : 'Clean',
      integrity.totalEvents,
      mh.length ? `${mh.filter((m) => m.status === 'met').length}/${mh.length}` : '',
      mh.map((m) => `${m.requirement}: ${MUST_HAVE_LABEL[m.status] ?? m.status}`).join('; '),
      durationMinutes(i),
      outcomeLabel(i.terminationReason),
    ]
  })

  const csv = '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
  const stamp = new Date().toISOString().slice(0, 10)
  const scope = positionId && interviews[0] ? slug(interviews[0].position.title) : 'all-positions'
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="levl1-results-${scope}-${stamp}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

// RFC 4180 quoting + spreadsheet formula-injection guard (=, +, -, @, tab, CR).
function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function parseDay(v: string | null, endOfDay = false): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  return new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
}

// Communication axis is four 0-10 sub-scores → one 0-100 number.
function communicationScore(c: unknown): { score: number; cefr: string } | null {
  if (!c || typeof c !== 'object') return null
  const o = c as Record<string, unknown>
  const parts = ['coherence', 'fluency', 'grammar', 'clarity'].map((k) => o[k]).filter((n): n is number => typeof n === 'number')
  if (!parts.length) return null
  return { score: Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10), cefr: typeof o.cefr === 'string' ? o.cefr : '' }
}

function durationMinutes(i: { actualDuration: number | null; startedAt: Date | null; completedAt: Date | null }): number | '' {
  if (i.actualDuration) return i.actualDuration
  if (i.startedAt && i.completedAt) return Math.max(0, Math.round((i.completedAt.getTime() - i.startedAt.getTime()) / 60000))
  return ''
}

function outcomeLabel(reason: string | null): string {
  switch (reason) {
    case 'TERMINATED_BY_CANDIDATE': return 'Ended early by candidate'
    case 'CONSENT_WITHDRAWN': return 'Consent withdrawn'
    case 'ABANDONED': return 'Abandoned'
    default: return 'Completed'
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'position'
