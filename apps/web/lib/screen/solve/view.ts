import { openArray, openText } from '@/lib/screen/privacy/fields'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { sanitizeSolveConfig } from './config'
import type { DefenseTurn } from './defense'
import type { AiExchange } from './assistant'

// One view of a Solve submission + the evidence behind its report. Used by the
// recruiter report API and (demo take-homes only) the prospect's own report.
export const SUBMISSION_VIEW_SELECT = {
  id: true, status: true, task: true, config: true, language: true, code: true, invitedAt: true, expiresAt: true, startedAt: true, deadlineAt: true, submittedAt: true,
  autoSubmitted: true, finalTests: true, submissionQuality: true, consentGiven: true, consentAt: true, consentNoticeVersion: true,
  defenseStatus: true, defenseDeadlineAt: true, defenseStartedAt: true, defenseCompletedAt: true, defenseTranscript: true, defenseInputMode: true,
  aiLog: true, report: true, score: true, recommendation: true, reportStatus: true, reportError: true, reportAttempts: true, purgedAt: true,
  candidate: { select: { id: true, name: true, email: true, score: true, recommendation: true, interview: { select: { status: true } } } },
  position: { select: { id: true, title: true, company: true } },
    } as const

type Row = { [K in keyof typeof SUBMISSION_VIEW_SELECT]: any }  // eslint-disable-line @typescript-eslint/no-explicit-any -- shape mirrors the select above

export function buildSubmissionView(s: Row, canEdit: boolean) {
  const task = sanitizeTask(s.task)
  return {
    id: s.id, status: s.status, canEdit,
    candidate: { id: s.candidate.id, name: s.candidate.name, email: s.candidate.email, screen: s.candidate.interview?.status === 'completed' ? { score: s.candidate.score, recommendation: s.candidate.recommendation } : null },
    position: s.position,
    task: task ? { title: task.title, prompt: task.prompt, tests: task.tests.map(({ id, name, hidden }) => ({ id, name, hidden })), lookFor: task.lookFor, probeAngles: task.probeAngles } : null,
    config: sanitizeSolveConfig(s.config),
    timing: { invitedAt: s.invitedAt, expiresAt: s.expiresAt, startedAt: s.startedAt, deadlineAt: s.deadlineAt, submittedAt: s.submittedAt, autoSubmitted: s.autoSubmitted },
    consent: { given: s.consentGiven, at: s.consentAt, noticeVersion: s.consentNoticeVersion },
    work: { language: s.language, code: s.purgedAt ? null : openText(s.code), finalTests: s.finalTests ?? null, quality: s.submissionQuality, purgedAt: s.purgedAt },
    defense: {
      status: s.defenseStatus, deadlineAt: s.defenseDeadlineAt, startedAt: s.defenseStartedAt, completedAt: s.defenseCompletedAt, inputMode: s.defenseInputMode,
      turns: openArray<DefenseTurn>(s.defenseTranscript).map(({ speaker, text, mode }) => ({ speaker, text, mode: mode ?? null })),
    },
    ai: { exchanges: s.purgedAt ? [] : openArray<AiExchange>(s.aiLog).map(({ id, t, prompt, includedCode, response, blocks, error }) => ({ id, t, prompt, includedCode, response, blocks, error: error ?? null })) },
    report: s.report ?? null, score: s.score, recommendation: s.recommendation,
    reportStatus: s.reportStatus, reportError: s.reportStatus === 'failed' ? s.reportError : null, reportAttempts: s.reportAttempts,
  }
}
