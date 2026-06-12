export function applicationReceivedCandidateEmail(opts: { candidateName: string; jobTitle: string; company: string }): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
    <h2 style="margin:0 0 8px">Application received ✅</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6">
      Hi ${opts.candidateName}, we&apos;ve received your application for
      <strong>${opts.jobTitle}</strong> at <strong>${opts.company}</strong>.
      The hiring team will review it and be in touch.
    </p>
    <p style="color:#94A3B8;font-size:12px;margin-top:20px">Powered by Levl1 Hire</p>
  </div></body></html>`
}

export function newApplicationRecruiterEmail(opts: { recruiterName: string; candidateName: string; jobTitle: string; appUrl: string; jobId: string }): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
    <h2 style="margin:0 0 8px">New application</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6">
      <strong>${opts.candidateName}</strong> just applied for <strong>${opts.jobTitle}</strong>.
    </p>
    <p><a href="${opts.appUrl}/hire/jobs/${opts.jobId}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">View candidate →</a></p>
  </div></body></html>`
}
