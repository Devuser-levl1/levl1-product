import { screenEmailLogoHtml } from '@/lib/screen/brand/email-logo'

// ── Question-approval emails (Screen-scoped, server-only) ──────────────────
// Fixpack 7 #3. The tech-lead and HR emails used to share ONE subject and an
// almost identical body. When both went to the same inbox (in-house accounts
// pre-filled both approvers from the hiring contact) Gmail threaded them and
// collapsed the repeated second body behind "…" — so the HR review link looked
// missing / sat in the "next body". Now:
//   • each role has its own subject and its own intro (no threading/trimming)
//   • the link is in the body twice: a bulletproof table button AND the plain
//     URL as text (works when buttons/images are stripped)
//   • one recipient approving both sections gets ONE email with both links
//   • every interpolated value is HTML-escaped

export type ApproverRole = 'tech_lead' | 'hr'

const ROLE: Record<ApproverRole, { who: string; section: string; scope: string; cta: string }> = {
  tech_lead: { who: 'Technical Lead', section: 'Technical questions', scope: 'technical, scenario and whiteboard questions', cta: 'Review technical questions' },
  hr:        { who: 'HR',             section: 'Behavioural & EQ questions', scope: 'behavioural and EQ questions', cta: 'Review behavioural & EQ questions' },
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export interface ApprovalLink { role: ApproverRole; url: string }
export interface ApprovalEmailInput { positionTitle: string; company: string; agencyName: string; links: ApprovalLink[] }

export function approvalEmailSubject(o: ApprovalEmailInput): string {
  const roles = o.links.map((l) => l.role)
  const what = roles.length > 1 ? 'interview questions' : roles[0] === 'hr' ? 'behavioural & EQ questions' : 'technical questions'
  return `Action required: approve ${what} for ${o.positionTitle}`
}

function button(url: string, label: string) {
  const u = esc(url)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px"><tr>
<td style="background:#4F46E5;border-radius:8px"><a href="${u}" target="_blank" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;font-family:Inter,system-ui,sans-serif">${esc(label)} &rarr;</a></td>
</tr></table>
<p style="margin:0 0 20px;font-size:12px;color:#71717A;line-height:1.5">Or open this link: <a href="${u}" target="_blank" style="color:#4F46E5;word-break:break-all">${u}</a></p>`
}

export function approvalEmailHtml(o: ApprovalEmailInput): string {
  const combined = o.links.length > 1
  const who = combined ? 'Technical Lead and HR' : ROLE[o.links[0].role].who
  const scope = combined ? 'the technical and the behavioural & EQ questions' : `the ${ROLE[o.links[0].role].scope}`
  const blocks = o.links.map((l) => `${combined ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181B">${esc(ROLE[l.role].section)}</p>` : ''}${button(l.url, ROLE[l.role].cta)}`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;border:1px solid #E4E4E7;overflow:hidden">
  <div style="background:#4F46E5;padding:24px 28px">
    ${screenEmailLogoHtml({ onDark: true, height: 34 })}
    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:10px">Question approval &middot; ${esc(who)}</div>
  </div>
  <div style="padding:28px">
    <h2 style="margin:0 0 12px;font-size:19px;font-weight:600;color:#18181B">Approve ${esc(scope)} for ${esc(o.positionTitle)}</h2>
    <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0 0 20px"><strong>${esc(o.agencyName)}</strong> has drafted interview questions for the <strong>${esc(o.positionTitle)}</strong> role at <strong>${esc(o.company)}</strong>. Please review ${esc(scope)} — you can edit, remove or add questions, then approve. Interviews start once questions are approved.</p>
    ${blocks}
    <p style="font-size:12px;color:#A1A1AA;margin:8px 0 0">${combined ? 'These links expire' : 'This link expires'} in 7 days. No login required.</p>
  </div>
</div></body></html>`
}
