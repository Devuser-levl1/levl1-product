import { prisma } from '@/lib/prisma'
import { readCapturePolicy } from '@/lib/screen/privacy/policy'
import { LINK_REPLACED_MESSAGE, linkKeyOk, maxReschedules, recoveryState, type RecoveryState } from '@/lib/screen/recovery/state'

/**
 * Candidate-safe view of an interview. ONLY the fields a candidate is allowed
 * to see — never scores, recommendations, other candidates, or agency internals
 * beyond public branding (name / logo / brand color).
 */
export interface CandidatePortalData {
  interviewId: string
  status: string
  scheduledAt: string | null
  consentGiven: boolean
  // Captured-data privacy: the specific photo/recording/camera consent + the
  // retention periods the candidate notice states (same values the purge uses).
  mediaConsentGiven: boolean
  privacy: { mediaRetentionDays: number; transcriptRetentionDays: number }
  duration: number
  candidateFirstName: string
  candidateName: string
  positionTitle: string
  company: string
  agencyName: string
  agencyLogoUrl: string | null
  brandColor: string
  // Recovery: the link key the candidate arrived with (carried on every
  // navigation / API call), the derived state, and reschedule allowance.
  linkKey: string | null
  recovery: RecoveryState
  reschedulesLeft: number
}

export type PortalResult =
  | { ok: true; data: CandidatePortalData }
  | { ok: false; reason: string }

export async function loadCandidateInterview(interviewId: string, linkKey?: string | null): Promise<PortalResult> {
  if (!interviewId) return { ok: false, reason: 'Invalid interview link. Please contact your recruiter.' }

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      liveState: { select: { lastBeatAt: true } },
      candidate: { select: { name: true } },
      position: {
        select: {
          title: true,
          company: true,
          agency: { select: { name: true, logoUrl: true, brandColor: true } },
        },
      },
    },
  })

  if (!interview) {
    return { ok: false, reason: 'Invalid interview link. Please contact your recruiter.' }
  }

  // A re-issued link supersedes older ones (legacy links without a key stay valid).
  if (!linkKeyOk(interview.inviteKey, linkKey)) return { ok: false, reason: LINK_REPLACED_MESSAGE }

  const agency = interview.position.agency
  const policy = readCapturePolicy()
  return {
    ok: true,
    data: {
      interviewId: interview.id,
      status: interview.status,
      scheduledAt: interview.scheduledAt ? interview.scheduledAt.toISOString() : null,
      consentGiven: interview.consentGiven,
      mediaConsentGiven: interview.mediaConsentGiven,
      privacy: { mediaRetentionDays: policy.mediaRetentionDays, transcriptRetentionDays: policy.transcriptRetentionDays },
      duration: interview.duration ?? 30,
      candidateFirstName: interview.candidate.name.split(' ')[0] || interview.candidate.name,
      candidateName: interview.candidate.name,
      positionTitle: interview.position.title,
      company: interview.position.company,
      agencyName: agency?.name ?? 'The hiring team',
      agencyLogoUrl: agency?.logoUrl ?? null,
      brandColor: agency?.brandColor ?? '#4F46E5',
      linkKey: interview.inviteKey ? linkKey ?? null : null,
      recovery: recoveryState({ status: interview.status, terminationReason: interview.terminationReason, lastBeatAt: interview.liveState?.lastBeatAt, startedAt: interview.startedAt }),
      reschedulesLeft: Math.max(0, maxReschedules() - interview.rescheduleCount),
    },
  }
}
