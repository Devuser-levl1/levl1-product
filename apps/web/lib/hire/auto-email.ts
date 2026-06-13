import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { personalize } from '@/lib/hire/campaigns'

// Fire a single templated email when a candidate enters a job's configured
// auto-email stage. Best-effort; never throws into the caller.
export async function maybeAutoEmail(candidateId: string, toStage: string) {
  try {
    const c = await prisma.hireCandidate.findUnique({
      where: { id: candidateId },
      include: { job: { include: { client: { select: { name: true } } } }, tenant: { select: { name: true } } },
    })
    const job = c?.job
    if (!c || !job?.autoEmailStage || job.autoEmailStage !== toStage) return
    if (!c.email || c.emailOptOut) return
    const r = { name: c.name, email: c.email, job: job.title, company: job.client?.name }
    await sendEmail({
      to: c.email,
      from: `${c.tenant.name} via Levl1 <${process.env.FROM_EMAIL ?? 'noreply@mail.levl1.io'}>`,
      subject: personalize(job.autoEmailSubject || `Update on your application for {{job}}`, r),
      html: `<div style="font-family:Inter,system-ui,sans-serif;color:#0F172A">${personalize(job.autoEmailBody || `Hi {{name}}, thanks for your interest in {{job}}. We'll be in touch with next steps.`, r)}</div>`,
    })
    await prisma.hireCandidateActivity.create({ data: { candidateId: c.id, type: 'email_sent', note: `Auto-email sent on entering ${toStage}` } })
  } catch (e) {
    console.error('[hire/auto-email] failed:', e)
  }
}
