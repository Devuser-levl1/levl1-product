import { sendEmail } from '@/lib/emailService'
import { prisma } from '@/lib/prisma'
import { interviewScheduledCandidateEmail, interviewScheduledInterviewerEmail } from '@/emails/hire/interview-scheduled'

export async function sendHireEmail(opts: { to: string; subject: string; html: string; replyTo?: string; from?: string; attachments?: { filename: string; content: string; contentType?: string }[] }) {
  return sendEmail(opts)
}

const JOB_URL = (jobId: string) => `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'}/hire/jobs/${jobId}`

/** Notify a recruiter that a job has been assigned to them (by an admin/manager or a tag). */
export async function sendJobAssignedEmail(to: string, jobId: string, jobTitle: string, byName: string | null): Promise<void> {
  if (!to) return
  const by = byName ? ` by ${byName}` : ''
  await sendHireEmail({
    to,
    subject: `New job assigned to you: ${jobTitle}`,
    html: `<p>You've been assigned to <strong>${jobTitle}</strong>${by} in HirePilot.</p><p><a href="${JOB_URL(jobId)}">Open the job →</a></p>`,
  }).catch(() => {})
}

/** Notify admins that a team member self-assigned a job. */
export async function sendSelfAssignAdminEmail(to: string, jobId: string, jobTitle: string, recruiterName: string | null): Promise<void> {
  if (!to) return
  const who = recruiterName ?? 'A team member'
  await sendHireEmail({
    to,
    subject: `${who} self-assigned: ${jobTitle}`,
    html: `<p><strong>${who}</strong> has taken the job <strong>${jobTitle}</strong> in HirePilot.</p><p><a href="${JOB_URL(jobId)}">Open the job →</a></p>`,
  }).catch(() => {})
}

interface InterviewLike { id: string; scheduledAt: Date; durationMins: number; type: string; meetLink: string | null; interviewers: unknown }
interface CandidateLike { id: string; name: string; email: string | null; aiScore: number | null; aiSummary: string | null; job: { title: string } | null }

function fmtIST(d: Date): string {
  return d.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST'
}

export async function sendHireInterviewEmails(
  interview: InterviewLike,
  candidate: CandidateLike,
  ctx: { tenantId: string; userId: string },
  opts: { reminder?: '24hr' | '1hr' } = {},
) {
  const [tenant, recruiter] = await Promise.all([
    prisma.hireTenant.findUnique({ where: { id: ctx.tenantId } }),
    prisma.hireUser.findUnique({ where: { id: ctx.userId } }).catch(() => null),
  ])
  const tenantName = tenant?.name ?? 'HirePilot'
  const from = `${tenantName} via Levl1 <${process.env.FROM_EMAIL ?? 'noreply@mail.levl1.io'}>`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const whenStr = fmtIST(new Date(interview.scheduledAt))
  const jobTitle = candidate.job?.title ?? ''
  const prefix = opts.reminder ? `Reminder (${opts.reminder === '1hr' ? 'in 1 hour' : 'tomorrow'}): ` : ''

  if (candidate.email) {
    await sendEmail({
      to: candidate.email,
      from,
      replyTo: recruiter?.email,
      subject: `${prefix}Interview scheduled — ${jobTitle || interview.type} at ${tenantName}`,
      html: interviewScheduledCandidateEmail({ candidateName: candidate.name, jobTitle, tenantName, whenStr, durationMins: interview.durationMins, type: interview.type, meetLink: interview.meetLink }),
    }).catch((e) => console.error('[hire/email] candidate send failed:', e))
  }

  const interviewers = Array.isArray(interview.interviewers) ? (interview.interviewers as unknown[]) : []
  for (const iv of interviewers) {
    if (typeof iv === 'string' && iv.includes('@')) {
      await sendEmail({
        to: iv,
        from,
        subject: `${prefix}You're interviewing ${candidate.name} — ${whenStr}`,
        html: interviewScheduledInterviewerEmail({ interviewerLabel: iv, candidateName: candidate.name, jobTitle, whenStr, meetLink: interview.meetLink, profileUrl: `${appUrl}/hire/candidates?open=${candidate.id}`, aiScore: candidate.aiScore, aiSummary: candidate.aiSummary }),
      }).catch((e) => console.error('[hire/email] interviewer send failed:', e))
    }
  }
}

// Schedule 24h + 1h reminder jobs (best-effort; pg-boss).
export async function scheduleInterviewReminders(interviewId: string, scheduledAt: Date) {
  try {
    const { getReminderQueue } = await import('@/lib/hire/jobs/queue')
    const queue = await getReminderQueue()
    const t24 = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
    const t1 = new Date(scheduledAt.getTime() - 60 * 60 * 1000)
    if (t24 > new Date()) await queue.send('hire-interview-reminder', { interviewId, kind: '24hr' }, { startAfter: t24 })
    if (t1 > new Date()) await queue.send('hire-interview-reminder', { interviewId, kind: '1hr' }, { startAfter: t1 })
  } catch (e) {
    console.error('[hire/email] scheduleInterviewReminders failed:', e)
  }
}
