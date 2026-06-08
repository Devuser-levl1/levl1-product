import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
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
      strengthAreas:          r.strengthAreas,
      concernAreas:           r.concernAreas,
      questionWiseEvaluation: r.questionWiseEvaluation,
      transcriptHighlights:   r.transcriptHighlights,
      hrNote:                 r.hrNote,
      l2Recommendation:       r.l2Recommendation,
      // Metadata
      interviewId,
      candidateId:    candidate.id,
      candidateName:  candidate.name,
      candidateEmail: candidate.email,
      positionTitle:  p?.title ?? '',
      company:        p?.company ?? '',
      interviewDate:  (candidate.interviewedAt ?? r.generatedAt)
                        .toISOString().slice(0, 10),
      duration:       p?.interviewDuration ?? 30,
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
        photoUrl:        v.photoUrl,
        tabSwitchCount:  v.tabSwitchCount,
        faceMissingMs:   v.faceMissingMs,
        multipleFaces:   v.multipleFaces,
        integrityScore:  v.integrityScore,
        integrityFlags:  v.integrityFlags ?? [],
      } : null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch report'
    console.error('[reports/interview] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
