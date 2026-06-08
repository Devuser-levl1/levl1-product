/**
 * Email service using Resend REST API (no SDK needed).
 * Required env vars:
 *   RESEND_API_KEY   — Resend API key
 *   FROM_EMAIL       — verified sender address, e.g. "Levl1 <noreply@mail.levl1.io>"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_FROM = process.env.FROM_EMAIL ?? 'Levl1 <noreply@mail.levl1.io>'

/**
 * Resolve the correct `from` address for an agency. Only use the agency's own
 * sender once its domain is verified in Resend — otherwise Resend rejects the
 * send. Falls back to the shared Levl1 sender.
 */
export function agencyFromAddress(agency: {
  name: string
  senderName?: string | null
  senderEmail?: string | null
  resendDomainVerified?: boolean | null
}): string {
  if (agency.resendDomainVerified && agency.senderEmail && agency.senderName) {
    return `${agency.senderName} <${agency.senderEmail}>`
  }
  return `${agency.name} via Levl1 <${DEFAULT_FROM.replace(/^.*<|>$/g, '') || 'noreply@mail.levl1.io'}>`
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail(opts: EmailOptions): Promise<{ id?: string }> {
  // Debug: log key env vars on every send attempt
  console.log('[email] FROM_EMAIL:', process.env.FROM_EMAIL)
  console.log('[email] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
  console.log('[email] RESEND_API_KEY prefix:', process.env.RESEND_API_KEY?.slice(0, 8))

  if (!RESEND_API_KEY) {
    // Dev fallback — log to console, don't throw (so other DB writes still complete)
    console.log('[emailService] RESEND_API_KEY not set — logging email instead of sending')
    console.log('[emailService] TO:', opts.to)
    console.log('[emailService] SUBJECT:', opts.subject)
    return {}
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from ?? DEFAULT_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? err.error ?? `Email send failed (${res.status})`)
  }

  const data = await res.json()
  return { id: data.id }
}

// ── Email templates ──────────────────────────────────────────────

export function inviteEmailHtml(opts: {
  candidateName: string
  positionTitle: string
  company: string
  agencyName: string
  schedulingUrl: string
  duration: number
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(79,70,229,0.08)">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 32px 28px">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.025em">Levl1</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">AI Interview Platform</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1E293B">Interview Invitation</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px">
      Hi ${opts.candidateName},<br><br>
      Congratulations — you have been shortlisted for the <strong>${opts.positionTitle}</strong> role at <strong>${opts.company}</strong>.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:#94A3B8;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em">Interview Details</div>
      <div style="font-size:14px;color:#475569"><strong>Format:</strong> AI-powered voice interview</div>
      <div style="font-size:14px;color:#475569;margin-top:6px"><strong>Duration:</strong> approximately ${opts.duration} minutes</div>
      <div style="font-size:14px;color:#475569;margin-top:6px"><strong>Tech needed:</strong> laptop or desktop with microphone</div>
    </div>
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:700;color:#B45309;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Please note before you continue</div>
      <div style="font-size:13px;color:#92400E;line-height:1.6">
        This is an <strong>L1 technical interview conducted by an AI interviewer</strong> (not a human).
        It takes approximately ${opts.duration} minutes, covers <strong>technical and behavioral</strong> questions,
        and your responses will be <strong>recorded and evaluated</strong>. You will be asked to acknowledge and
        consent to this on the scheduling page before choosing a time.
      </div>
    </div>
    <a href="${opts.schedulingUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(79,70,229,0.25)">
      Review Consent &amp; Select Your Slot &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px;line-height:1.6">
      This interview is conducted by ${opts.agencyName} using the Levl1 AI Interview Platform.
      If you have questions, reply to this email.
    </p>
  </div>
</div>
</body>
</html>`
}

export function confirmationEmailHtml(opts: {
  candidateName: string
  positionTitle: string
  company: string
  scheduledAt: Date
  duration: number
  interviewUrl: string
}): string {
  const dateStr = opts.scheduledAt.toLocaleString('en-IN', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata'
  })
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden">
  <div style="background:linear-gradient(135deg,#10B981,#059669);padding:32px">
    <div style="font-size:28px;margin-bottom:8px">&#10003;</div>
    <div style="font-size:20px;font-weight:800;color:#fff">Interview Confirmed!</div>
  </div>
  <div style="padding:32px">
    <p style="color:#475569;font-size:14px;line-height:1.6">Hi ${opts.candidateName}, your interview is confirmed.</p>
    <div style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:10px;padding:16px 20px;margin:20px 0">
      <div style="font-size:15px;font-weight:700;color:#065F46">${opts.positionTitle} at ${opts.company}</div>
      <div style="font-size:14px;color:#047857;margin-top:6px">${dateStr}</div>
      <div style="font-size:13px;color:#6EE7B7;margin-top:4px">${opts.duration} minutes</div>
    </div>
    <a href="${opts.interviewUrl}" style="display:block;background:#10B981;color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      Join Interview When Ready &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:16px">Keep this email — you will need the link to join your interview.</p>
  </div>
</div>
</body>
</html>`
}

export function reportReadyEmailHtml(opts: {
  recruiterName: string
  candidateName: string
  positionTitle: string
  score: number
  recommendation: string
  reportUrl: string
}): string {
  const recColors: Record<string, string> = {
    strong_yes: '#059669', yes: '#10B981', maybe: '#D97706', no: '#DC2626'
  }
  const color = recColors[opts.recommendation] ?? '#64748B'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px">
    <div style="font-size:18px;font-weight:800;color:#fff">Interview Report Ready</div>
  </div>
  <div style="padding:32px">
    <p style="color:#475569;font-size:14px">Hi ${opts.recruiterName},</p>
    <p style="color:#475569;font-size:14px;line-height:1.6">The evaluation report for <strong>${opts.candidateName}</strong> (${opts.positionTitle}) is ready.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin:20px 0;display:flex;gap:20px">
      <div><div style="font-size:12px;color:#94A3B8">Score</div><div style="font-size:24px;font-weight:800;color:#4F46E5">${opts.score}</div></div>
      <div><div style="font-size:12px;color:#94A3B8">Recommendation</div><div style="font-size:16px;font-weight:700;color:${color};text-transform:capitalize">${opts.recommendation.replace('_', ' ')}</div></div>
    </div>
    <a href="${opts.reportUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      View Full Report &rarr;
    </a>
  </div>
</div>
</body>
</html>`
}
