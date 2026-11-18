import { screenEmailLogoHtml } from '@/lib/screen/brand/email-logo'
import { PRODUCTS } from '@/config/site'

// ── Solve invite email (Screen-scoped) ─────────────────────────────────────
// Candidate-facing. The link is the only credential (no login), so it appears
// as a button AND as plain text. Every interpolated value is HTML-escaped.

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export interface SolveInviteInput {
  candidateName: string; positionTitle: string; company: string; orgName: string
  url: string; expiresAt: Date; durationMinutes: number; defenseRequired: boolean
}

export const solveInviteSubject = (o: SolveInviteInput) => `Your take-home assessment for ${o.positionTitle}`

export function solveInviteHtml(o: SolveInviteInput): string {
  const first = o.candidateName.trim().split(/\s+/)[0] || o.candidateName
  const by = o.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const u = esc(o.url)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;border:1px solid #E4E4E7;overflow:hidden">
  <div style="background:#4F46E5;padding:24px 28px">${screenEmailLogoHtml({ onDark: true, height: 34 })}
    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:10px">${esc(PRODUCTS.takeHome.name)} &middot; take-home assessment</div></div>
  <div style="padding:28px">
    <h2 style="margin:0 0 12px;font-size:19px;font-weight:600;color:#18181B">Hi ${esc(first)}, your take-home is ready</h2>
    <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0 0 16px"><strong>${esc(o.orgName)}</strong> has invited you to a take-home assessment for the <strong>${esc(o.positionTitle)}</strong> role at <strong>${esc(o.company)}</strong>. It's a real-world task you solve in a code editor in your browser, on your own time.</p>
    <ul style="color:#52525B;font-size:14px;line-height:1.7;margin:0 0 20px;padding-left:18px">
      <li>Start any time before <strong>${esc(by)}</strong>.</li>
      <li>Once you start, you have <strong>${o.durationMinutes} minutes</strong>. The clock keeps running if you close the page, and your work is saved as you go.</li>
      ${o.defenseRequired ? '<li>After you submit, there is a short spoken conversation (about 10 minutes) where you walk through your solution. You need a microphone for it.</li>' : ''}
    </ul>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr><td style="background:#4F46E5;border-radius:8px"><a href="${u}" target="_blank" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none">Open the take-home &rarr;</a></td></tr></table>
    <p style="margin:0 0 18px;font-size:12px;color:#71717A;line-height:1.5">Or open this link: <a href="${u}" style="color:#4F46E5;word-break:break-all">${u}</a></p>
    <p style="font-size:12px;color:#A1A1AA;margin:0">This link is personal to you. Don't share it. You'll see what is captured and why before you start.</p>
  </div>
</div></body></html>`
}
