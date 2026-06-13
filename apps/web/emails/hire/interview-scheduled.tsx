interface CandidateEmailProps { candidateName: string; jobTitle: string; tenantName: string; whenStr: string; durationMins: number; type: string; meetLink: string | null }
export function interviewScheduledCandidateEmail(p: CandidateEmailProps): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
<div style="max-width:520px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
  <h2 style="margin:0 0 6px">Interview scheduled</h2>
  <div style="font-size:13px;color:#64748B;margin-bottom:16px">${p.tenantName}</div>
  <p style="font-size:14px;color:#475569;line-height:1.6">Hi ${p.candidateName}, your <strong>${p.type}</strong> interview${p.jobTitle ? ` for <strong>${p.jobTitle}</strong>` : ''} is scheduled for:</p>
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin:12px 0">
    <div style="font-size:15px;font-weight:700">${p.whenStr}</div>
    <div style="font-size:13px;color:#64748B;margin-top:4px">${p.durationMins} minutes</div>
  </div>
  ${p.meetLink ? `<a href="${p.meetLink}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Join the meeting</a>` : ''}
  <p style="font-size:12px;color:#94A3B8;margin-top:18px">Reply to this email to reschedule or ask a question.</p>
</div></body></html>`
}

interface InterviewerEmailProps { interviewerLabel: string; candidateName: string; jobTitle: string; whenStr: string; meetLink: string | null; profileUrl: string; aiScore: number | null; aiSummary: string | null }
export function interviewScheduledInterviewerEmail(p: InterviewerEmailProps): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
<div style="max-width:520px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
  <h2 style="margin:0 0 12px">You're interviewing ${p.candidateName}</h2>
  <p style="font-size:14px;color:#475569;line-height:1.6">${p.jobTitle ? `Role: <strong>${p.jobTitle}</strong><br/>` : ''}When: <strong>${p.whenStr}</strong></p>
  ${p.aiScore != null ? `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin:12px 0"><div style="font-size:13px;font-weight:700;color:#4F46E5">AI score: ${p.aiScore}/100</div>${p.aiSummary ? `<div style="font-size:13px;color:#475569;margin-top:6px">${p.aiSummary}</div>` : ''}</div>` : ''}
  ${p.meetLink ? `<a href="${p.meetLink}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:8px">Join meeting</a>` : ''}
  <a href="${p.profileUrl}" style="display:inline-block;background:#fff;border:1px solid #E2E8F0;color:#475569;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">View candidate</a>
</div></body></html>`
}
