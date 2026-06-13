import { prisma } from '@/lib/prisma'
import { sendHireInterviewEmails } from '@/lib/hire/email'

export const REMINDER_JOB = 'hire-interview-reminder'

export async function interviewReminderHandler(data: { interviewId: string; kind: '24hr' | '1hr' }) {
  const interview = await prisma.hireInterview.findUnique({
    where: { id: data.interviewId },
    include: { candidate: { include: { job: { select: { title: true } }, tenant: { select: { id: true } } } } },
  })
  if (!interview || interview.status !== 'SCHEDULED') {
    console.log('[hire-interview-reminder] skip — not scheduled:', data.interviewId)
    return
  }
  // Skip stale reminders (interview moved earlier/later such that this window passed long ago)
  const sent = (interview.remindersSent as Record<string, boolean> | null) ?? {}
  if (sent[data.kind]) {
    console.log('[hire-interview-reminder] skip — already sent', data.kind)
    return
  }
  // If the interview is already in the past, skip.
  if (new Date(interview.scheduledAt).getTime() < Date.now() - 5 * 60 * 1000) {
    console.log('[hire-interview-reminder] skip — in the past')
    return
  }

  await sendHireInterviewEmails(interview, interview.candidate, { tenantId: interview.candidate.tenantId, userId: '' }, { reminder: data.kind })
  await prisma.hireInterview.update({ where: { id: interview.id }, data: { remindersSent: { ...sent, [data.kind]: true } } })
  console.log('[hire-interview-reminder] sent', data.kind, 'for', interview.id)
}
