// ── Candidate invite email template (Screen-scoped) ────────────────────────
// Recruiters edit a PLAIN-TEXT subject + body with {{variables}}. Rendering is
// done here, server-side for sending (and client-side for the live preview —
// this module is pure, no server deps). Safety:
//   • the template text and every variable value are HTML-escaped, so neither
//     a recruiter's edit nor a candidate's name can inject markup;
//   • only whitelisted variables are substituted; unknown ones fail validation;
//   • the subject is single-line (no header injection) and length-capped;
//   • the AI-interview / recording disclosure and the "Select your slot" button
//     are fixed parts of the shell, so an edit can never remove them.

export const INVITE_VARIABLES = [
  { key: 'candidate_name', label: 'Candidate full name', sample: 'Priya Sharma' },
  { key: 'candidate_first_name', label: 'Candidate first name', sample: 'Priya' },
  { key: 'position_title', label: 'Position title', sample: 'Senior Backend Engineer' },
  { key: 'company', label: 'Hiring company', sample: 'Acme Fintech' },
  { key: 'agency_name', label: 'Your agency / sender name', sample: 'TalentBridge' },
  { key: 'duration_minutes', label: 'Interview length (minutes)', sample: '30' },
  { key: 'scheduling_link', label: 'Scheduling link (pick a slot)', sample: 'https://levl1.io/schedule/abc123' },
  { key: 'interview_link', label: 'Direct interview link', sample: 'https://levl1.io/interview/abc123' },
  { key: 'consent_link', label: 'Consent notice link (shown before the interview starts)', sample: 'https://levl1.io/interview/abc123' },
] as const

export type InviteVariable = (typeof INVITE_VARIABLES)[number]['key']
export type InviteVars = Record<InviteVariable, string>

const KEYS = new Set<string>(INVITE_VARIABLES.map((v) => v.key))
const LINK_KEYS = new Set<string>(['scheduling_link', 'interview_link', 'consent_link'])

export const SUBJECT_MAX = 200
export const BODY_MAX = 5000

export const DEFAULT_INVITE_SUBJECT = 'Interview invitation — {{position_title}} at {{company}}'
export const DEFAULT_INVITE_BODY = `Hi {{candidate_first_name}},

Congratulations — you have been shortlisted for the {{position_title}} role at {{company}}.

The next step is a short AI-led voice interview of about {{duration_minutes}} minutes. Please use a laptop or desktop with a working microphone and a quiet space.

Use the button below to choose a time that suits you.

Best of luck,
{{agency_name}}`

export interface InviteTemplate { subject: string; body: string }

const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function sampleVars(): InviteVars {
  return Object.fromEntries(INVITE_VARIABLES.map((v) => [v.key, v.sample])) as InviteVars
}

/** Errors a recruiter must fix before the template can be saved (empty = OK). */
export function validateTemplate(t: InviteTemplate): string[] {
  const errors: string[] = []
  const subject = t.subject ?? ''
  const body = t.body ?? ''
  if (!subject.trim()) errors.push('Subject is required.')
  if (subject.length > SUBJECT_MAX) errors.push(`Subject must be ${SUBJECT_MAX} characters or fewer.`)
  if (/[\r\n]/.test(subject)) errors.push('Subject must be a single line.')
  if (!body.trim()) errors.push('Body is required.')
  if (body.length > BODY_MAX) errors.push(`Body must be ${BODY_MAX} characters or fewer.`)
  const unknown = new Set<string>()
  for (const m of Array.from(`${subject}\n${body}`.matchAll(TOKEN))) if (!KEYS.has(m[1])) unknown.add(m[1])
  if (unknown.size) errors.push(`Unknown variable${unknown.size > 1 ? 's' : ''}: ${Array.from(unknown).map((k) => `{{${k}}}`).join(', ')}`)
  if (/\{\{(?![^{}]*\}\})/.test(`${subject}${body}`)) errors.push('A variable is missing its closing "}}".')
  return errors
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : '#')

/** Subject: plain-text substitution, flattened to one line. */
export function renderSubject(subject: string, vars: InviteVars): string {
  return subject.replace(TOKEN, (_, k: string) => (KEYS.has(k) ? vars[k as InviteVariable] ?? '' : ''))
    .replace(/[\r\n]+/g, ' ').trim().slice(0, SUBJECT_MAX)
}

/** Plain-text body (for the text/plain part and previews). */
export function renderText(body: string, vars: InviteVars): string {
  return body.replace(TOKEN, (_, k: string) => (KEYS.has(k) ? vars[k as InviteVariable] ?? '' : ''))
}

/** Body → safe HTML fragment: escape everything, then substitute escaped values. */
function renderBodyHtml(body: string, vars: InviteVars): string {
  const paragraphs = body.replace(/\r\n/g, '\n').split(/\n{2,}/)
  return paragraphs.map((p) => {
    // Split around tokens so literal text and values are escaped independently.
    let html = ''
    let last = 0
    for (const m of Array.from(p.matchAll(TOKEN))) {
      html += escapeHtml(p.slice(last, m.index))
      const k = m[1]
      const v = KEYS.has(k) ? vars[k as InviteVariable] ?? '' : ''
      html += LINK_KEYS.has(k)
        ? `<a href="${escapeHtml(safeUrl(v))}" style="color:#4F46E5;font-weight:600">${escapeHtml(v)}</a>`
        : escapeHtml(v)
      last = (m.index ?? 0) + m[0].length
    }
    html += escapeHtml(p.slice(last))
    return `<p style="color:#334155;font-size:14px;line-height:1.65;margin:0 0 16px">${html.replace(/\n/g, '<br>')}</p>`
  }).join('')
}

/** Full branded email. The disclosure + consent/scheduling CTA are fixed. */
export function renderInviteEmail(t: InviteTemplate, vars: InviteVars): { subject: string; html: string; text: string } {
  const schedulingUrl = escapeHtml(safeUrl(vars.scheduling_link))
  const duration = escapeHtml(vars.duration_minutes)
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(79,70,229,0.08)">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px 24px">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.025em">${escapeHtml(vars.agency_name)}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">Interview invitation · ${escapeHtml(vars.position_title)}</div>
  </div>
  <div style="padding:32px">
    ${renderBodyHtml(t.body, vars)}
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;margin:8px 0 24px">
      <div style="font-size:12px;font-weight:700;color:#B45309;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Please note</div>
      <div style="font-size:13px;color:#92400E;line-height:1.6">
        This interview is conducted by an <strong>AI interviewer</strong> (not a human), takes about ${duration} minutes,
        and your responses will be <strong>recorded and evaluated</strong>. You'll be asked to review and consent to this before the interview starts.
      </div>
    </div>
    <a href="${schedulingUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(79,70,229,0.25)">
      Select your interview slot &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px;line-height:1.6">
      Sent by ${escapeHtml(vars.agency_name)} using the Levl1 AI Interview Platform. If you have questions, reply to this email.
    </p>
  </div>
</div>
</body>
</html>`
  const text = `${renderText(t.body, vars)}\n\n---\nThis interview is conducted by an AI interviewer, takes about ${vars.duration_minutes} minutes, and is recorded and evaluated.\nSelect your interview slot: ${vars.scheduling_link}`
  return { subject: renderSubject(t.subject, vars), html, text }
}

/** Precedence: position override → agency template → built-in default. */
export function resolveTemplate(
  position: { inviteEmailSubject: string | null; inviteEmailBody: string | null } | null,
  agency: { inviteEmailSubject: string | null; inviteEmailBody: string | null } | null,
): InviteTemplate & { source: 'position' | 'agency' | 'default' } {
  if (position?.inviteEmailSubject && position.inviteEmailBody) return { subject: position.inviteEmailSubject, body: position.inviteEmailBody, source: 'position' }
  if (agency?.inviteEmailSubject && agency.inviteEmailBody) return { subject: agency.inviteEmailSubject, body: agency.inviteEmailBody, source: 'agency' }
  return { subject: DEFAULT_INVITE_SUBJECT, body: DEFAULT_INVITE_BODY, source: 'default' }
}
