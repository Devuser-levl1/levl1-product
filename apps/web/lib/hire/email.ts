// Hire email send functions. Wraps the shared Resend transport.
import { sendEmail } from '@/lib/emailService'

export async function sendHireEmail(opts: { to: string; subject: string; html: string }) {
  return sendEmail({ to: opts.to, subject: opts.subject, html: opts.html })
}
