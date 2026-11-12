import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { effectiveInterviewMinutes } from '@/lib/screen/session/duration'
import { summarizeIntegrity } from '@/lib/screen/integrity/summary'
import { getSessionFromRequest } from '@/lib/auth'
import { openArray, openText, revealEvents } from '@/lib/screen/privacy/fields'
import { digest, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import { sanitizeTask } from '@/lib/screen/workspace/task'

export async function GET(
  req: NextRequest,
  { params }: { params: { interviewId: string } },
) {
  try {
    const { interviewId } = params
    if (!interviewId) {
      return NextResponse.json({ error: 'interviewId is required' }, { status: 400 })
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        verification: true,
        integrityEvents: { orderBy: { occurredAt: 'asc' } },
        cultureFit: true,
        workSample: true,
        candidate: {
          include: {
            report:   true,
            position: { include: { agency: { select: { name: true, logoUrl: true, brandColor: true } } } },
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Recruiter-only, agency-scoped. Demo-gallery runs stay public — the
    // anonymous prospect who just took the demo views their own report.
    if (!interview.isDemo) {
      const session = getSessionFromRequest(req)
      if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
      if (interview.candidate?.position?.agencyId !== session.agencyId) {
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
      }
    }

    const { candidate } = interview
    if (!candidate?.report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const r = candidate.report
    const p = candidate.position
    const agency = p?.agency
    const v = interview.verification

    return NextResponse.json({
      // Report fields
      overallScore:           r.overallScore,
      recommendation:         r.recommendation,
      professionalSummary:    r.professionalSummary,
      sectionScores:          r.sectionScores,
      communication:          r.communication ?? null,
      strengthAreas:          r.strengthAreas,
      concernAreas:           r.concernAreas,
      questionWiseEvaluation: r.questionWiseEvaluation,
      transcriptHighlights:   r.transcriptHighlights,
      hrNote:                 r.hrNote,
      l2Recommendation:       r.l2Recommendation,
      // Must-have requirements (Screen F3) — one met/not_met/insufficient verdict each.
      mustHaveAssessment:     r.mustHaveAssessment ?? null,
      // JD-based concept rubric ratings (#13)
      conceptAssessment:      r.conceptAssessment ?? null,
      // Rubric library — results by tier + the verdict gate
      rubricAssessment:       r.rubricAssessment ?? null,
      // Metadata
      interviewId,
      candidateId:    candidate.id,
      candidateName:  candidate.name,
      candidateEmail: candidate.email,
      positionTitle:  p?.title ?? '',
      company:        p?.company ?? '',
      interviewDate:  (candidate.interviewedAt ?? r.generatedAt)
                        .toISOString().slice(0, 10),
      duration:       effectiveInterviewMinutes(p),
      generatedAt:    r.generatedAt.toISOString(),
      // White-label branding
      agencyName:     agency?.name ?? null,
      agencyLogoUrl:  agency?.logoUrl ?? null,
      brandColor:     agency?.brandColor ?? '#4F46E5',
      // Identity & integrity
      verification: v ? {
        emailVerified:   !!v.otpVerifiedAt,
        nameConfirmed:   v.nameConfirmed,
        photoCaptured:   !!v.photoCapturedAt,
        // The photo itself is never embedded in the report payload — it is
        // served (decrypted, no-store, agency-gated, until media retention
        // ends) by /api/control-room/[id]/photo.
        photoAvailable:  !!v.photoUrl,
        tabSwitchCount:  v.tabSwitchCount,
        faceMissingMs:   v.faceMissingMs,
        multipleFaces:   v.multipleFaces,
        integrityScore:  v.integrityScore,
        integrityFlags:  v.integrityFlags ?? [],
      } : null,
      // Tier-1 proctoring summary (Build 01-A) — evidence-linked, human-review
      // routed, SEPARATE from the competency score. Build 04 styles this panel.
      integrity: summarizeIntegrity(revealEvents(interview.integrityEvents)),
      // Culture/values fit (Build 08) — SEPARATE axis, never blended into competency.
      cultureFit: interview.cultureFit
        ? { fitScore: interview.cultureFit.fitScore, summary: interview.cultureFit.summary, responses: interview.cultureFit.responses }
        : null,
      // Observe & Defend work sample — task, solution, tests, how it evolved,
      // and the SEPARATE judgment axes (never blended into the competency score).
      workSample: (() => {
        const w = interview.workSample
        const task = w ? sanitizeTask(w.task) : null
        if (!w || !task) return null
        const tl = digest(openArray<TimelineEvent>(w.timeline))
        return {
          task: { title: task.title, prompt: task.prompt, minutes: task.minutes, testCount: task.tests.length },
          language: w.language,
          code: openText(w.code) ?? '',
          submitted: !!w.submittedAt,
          tests: w.lastTests ?? [],
          executions: w.execCount,
          timeline: { durationMs: tl.durationMs, runs: tl.runs, testRuns: tl.testRuns, pastes: tl.pastes, rewrites: tl.rewrites, firstAllPassAt: tl.firstAllPassAt, moments: tl.moments },
          scores: w.scores ?? null,
        }
      })(),
      // How the session ended (Build 01-B) — distinguishes a real completion
      // from an early/consent-withdrawn stop.
      terminationReason: interview.terminationReason ?? null,
      // Demo run (Build 05) — drives the report's conversion gating + hiding the
      // integrity panel when no integrity data was captured.
      isDemo: interview.isDemo,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch report'
    console.error('[reports/interview] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
