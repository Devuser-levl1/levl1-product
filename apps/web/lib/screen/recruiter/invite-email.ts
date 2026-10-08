import { renderInviteEmail, resolveTemplate } from './invite-template'

// Server-side: build the candidate invite for an interview from the
// recruiter's template (position override → agency → default). Used by every
// path that invites a candidate (dashboard send, public API / ATS trigger).

interface TemplateFields { inviteEmailSubject: string | null; inviteEmailBody: string | null }

export function buildInviteEmail(opts: {
  interviewId: string
  candidateName: string
  position: TemplateFields & { title: string; company: string; interviewDuration: number | null }
  agency: TemplateFields & { name: string; senderName: string | null }
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
  const schedulingUrl = `${appUrl}/schedule/${opts.interviewId}`
  const joinUrl = `${appUrl}/interview/${opts.interviewId}`
  const name = opts.candidateName.trim()
  return renderInviteEmail(resolveTemplate(opts.position, opts.agency), {
    candidate_name: name,
    candidate_first_name: name.split(/\s+/)[0] ?? name,
    position_title: opts.position.title,
    company: opts.position.company,
    agency_name: opts.agency.senderName ?? opts.agency.name,
    duration_minutes: String(opts.position.interviewDuration ?? 30),
    scheduling_link: schedulingUrl,
    interview_link: joinUrl,
    consent_link: joinUrl, // consent is acknowledged on the interview page before it starts
  })
}
