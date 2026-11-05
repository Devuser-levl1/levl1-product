import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { appUrl } from '@/lib/screen/app-url'
import { screenEmailLogoHtml } from '@/lib/screen/brand/email-logo'
import { businessEmailError, normalizeEmail } from '@/lib/screen/auth/email'
import { ROLE_INFO, isScreenRole, type ScreenRole } from '@/lib/screen/auth/rbac'
import { noteUserChange } from '@/lib/screen/auth/session-guard'

// ── Screen team management (Screen-scoped, server-only) ────────────────────
// Invites (business email, Resend), role changes and removal. All callers must
// already have checked the caller is a workspace ADMIN (recruiterAccess admin).
// New members accept via /accept-invite then sign in with the existing OTP +
// business-email flow — no passwords.

export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

function inviteHtml(o: { inviter: string; agency: string; role: ScreenRole; url: string; reminder?: boolean }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #E4E4E7;overflow:hidden">
  <div style="background:#4F46E5;padding:24px 28px">${screenEmailLogoHtml({ onDark: true, height: 34 })}</div>
  <div style="padding:28px">
    <h2 style="margin:0 0 12px;font-size:19px;font-weight:600;color:#18181B">${o.reminder ? 'Reminder: you&#39;re invited' : 'You&#39;re invited'}</h2>
    <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0 0 20px">
      <strong>${esc(o.inviter)}</strong> has invited you to join <strong>${esc(o.agency)}</strong> on Screen as a <strong>${ROLE_INFO[o.role].label}</strong>.
      ${esc(ROLE_INFO[o.role].summary)}
    </p>
    <a href="${o.url}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Accept invitation</a>
    <p style="font-size:12px;color:#71717A;margin-top:20px">You will sign in with a one-time code sent to this email — no password needed. This link expires in 7 days. If you did not expect this email, you can ignore it.</p>
  </div>
</div></body></html>`
}

export type InviteResult = { email: string; ok: true; memberId: string } | { email: string; ok: false; error: string }

export async function inviteMember(opts: { agencyId: string; inviterName: string; email: string; name?: string; role: unknown }): Promise<InviteResult> {
  const email = normalizeEmail(opts.email)
  const err = businessEmailError(email)
  if (err) return { email, ok: false, error: err }
  if (!isScreenRole(opts.role)) return { email, ok: false, error: 'Pick a role: admin, recruiter or viewer.' }
  const role = opts.role

  const existing = await prisma.user.findUnique({ where: { email }, select: { agencyId: true, disabledAt: true } })
  if (existing && existing.agencyId !== opts.agencyId) return { email, ok: false, error: 'This email already belongs to another Screen workspace.' }
  if (existing && !existing.disabledAt) return { email, ok: false, error: 'Already a member of this workspace.' }

  const agency = await prisma.agency.findUnique({ where: { id: opts.agencyId }, select: { name: true } })
  if (!agency) return { email, ok: false, error: 'Workspace not found.' }

  const token = crypto.randomBytes(32).toString('hex')
  const pending = await prisma.teamMember.findFirst({ where: { agencyId: opts.agencyId, email, status: 'invited' }, select: { id: true } })
  const data = { name: opts.name?.trim() || email, role, status: 'invited', inviteToken: token, invitedAt: new Date() }
  const member = pending
    ? await prisma.teamMember.update({ where: { id: pending.id }, data })
    : await prisma.teamMember.create({ data: { agencyId: opts.agencyId, email, ...data } })

  if (process.env.RESEND_API_KEY) {
    await sendEmail({
      to: email,
      subject: `You've been invited to join ${agency.name} on Screen`,
      html: inviteHtml({ inviter: opts.inviterName, agency: agency.name, role, url: `${appUrl()}/accept-invite/${token}` }),
    }).catch((e) => console.error('[team] invite email failed:', e instanceof Error ? e.message : e))
  }
  return { email, ok: true, memberId: member.id }
}

export async function resendInvite(opts: { agencyId: string; inviterName: string; memberId: string }) {
  const m = await prisma.teamMember.findFirst({ where: { id: opts.memberId, agencyId: opts.agencyId }, include: { agency: { select: { name: true } } } })
  if (!m) return { ok: false as const, status: 404, error: 'Invite not found.' }
  if (m.status !== 'invited') return { ok: false as const, status: 400, error: 'This person has already joined.' }
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.teamMember.update({ where: { id: m.id }, data: { inviteToken: token, invitedAt: new Date() } })
  if (process.env.RESEND_API_KEY) {
    await sendEmail({
      to: m.email,
      subject: `Reminder: join ${m.agency.name} on Screen`,
      html: inviteHtml({ inviter: opts.inviterName, agency: m.agency.name, role: isScreenRole(m.role) ? m.role : 'recruiter', url: `${appUrl()}/accept-invite/${token}`, reminder: true }),
    }).catch((e) => console.error('[team] resend failed:', e instanceof Error ? e.message : e))
  }
  return { ok: true as const }
}

async function activeAdminCount(agencyId: string) {
  return prisma.user.count({ where: { agencyId, role: 'admin', disabledAt: null } })
}

/** Change an active member's role. Guards: valid role, same workspace, never removes the last admin. */
export async function changeRole(opts: { agencyId: string; actorId: string; userId: string; role: unknown }) {
  if (!isScreenRole(opts.role)) return { ok: false as const, status: 400, error: 'Pick a role: admin, recruiter or viewer.' }
  const u = await prisma.user.findFirst({ where: { id: opts.userId, agencyId: opts.agencyId, disabledAt: null }, select: { id: true, role: true, email: true } })
  if (!u) return { ok: false as const, status: 404, error: 'Member not found.' }
  if (u.role === 'admin' && opts.role !== 'admin' && (await activeAdminCount(opts.agencyId)) <= 1) {
    return { ok: false as const, status: 400, error: 'A workspace needs at least one admin. Make someone else an admin first.' }
  }
  await prisma.user.update({ where: { id: u.id }, data: { role: opts.role } })
  await prisma.teamMember.updateMany({ where: { agencyId: opts.agencyId, email: u.email }, data: { role: opts.role } })
  noteUserChange(u.id, { role: opts.role })   // takes effect on their next request
  return { ok: true as const, role: opts.role }
}

/**
 * Remove an active member: they lose access immediately (disabledAt + every
 * session invalidated). The row is kept (reports/audit reference users) and is
 * re-enabled if they are invited again later.
 */
export async function removeMember(opts: { agencyId: string; actorId: string; userId: string }) {
  if (opts.userId === opts.actorId) return { ok: false as const, status: 400, error: 'You can\'t remove yourself. Ask another admin.' }
  const u = await prisma.user.findFirst({ where: { id: opts.userId, agencyId: opts.agencyId, disabledAt: null }, select: { id: true, role: true, email: true } })
  if (!u) return { ok: false as const, status: 404, error: 'Member not found.' }
  if (u.role === 'admin' && (await activeAdminCount(opts.agencyId)) <= 1) return { ok: false as const, status: 400, error: 'You can\'t remove the last admin.' }
  const now = new Date()
  await prisma.user.update({ where: { id: u.id }, data: { disabledAt: now, sessionsValidAfter: now } })
  await prisma.teamMember.deleteMany({ where: { agencyId: opts.agencyId, email: u.email } })
  noteUserChange(u.id, { disabled: true, validAfter: now })
  return { ok: true as const }
}
