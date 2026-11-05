'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, LogOut, MailCheck, UserPlus, Trash2, RefreshCw } from 'lucide-react'
import { Alert, Badge, Button, useConfirm } from '@/components/screen/ui'
import { ROLE_INFO, SCREEN_ROLES, type ScreenRole } from '@/lib/screen/auth/rbac'

// ── Settings: account security + team & roles (Screen-scoped) ─────────────
// Account: re-verify sign-in email (one-time code), sign out other devices /
// everywhere. Screen auth is email + one-time code — there is no password.
// Team: admins invite (business email), change roles, revoke invites, remove
// members. Everyone else sees the team read-only.

interface Member { id: string; name: string; email: string; role: ScreenRole; lastLoginAt: string | null }
interface Invite { id: string; name: string; email: string; role: ScreenRole; expired: boolean; invitedAt: string | null }

const sub: React.CSSProperties = { fontSize: 13, color: 'var(--lv-text-muted)', margin: '4px 0 16px' }
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--lv-border)', flexWrap: 'wrap' }
const sel: React.CSSProperties = { width: 'auto', minWidth: 120, height: 32, fontSize: 13 }

function ago(iso: string | null) {
  if (!iso) return 'never signed in'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'active today' : d === 1 ? 'active yesterday' : `active ${d} days ago`
}

/* ── Your account ────────────────────────────────────────────────────────── */
export function AccountSecurity({ email }: { email: string }) {
  const [step, setStep] = useState<'idle' | 'sent'>('idle')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirm()

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error ?? 'Something went wrong. Please try again.')
    return d
  }
  const send = async () => {
    setBusy('send')
    try { await post('/api/account/reverify', { action: 'send' }); setStep('sent'); toast.success(`Code sent to ${email}`) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t send the code.') } finally { setBusy(null) }
  }
  const verify = async () => {
    setBusy('verify')
    try { const d = await post('/api/account/reverify', { action: 'verify', code }); setVerifiedAt(d.reverifiedAt); setStep('idle'); setCode(''); toast.success('Email confirmed') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t verify the code.') } finally { setBusy(null) }
  }
  const signOut = async (scope: 'others' | 'all') => {
    if (scope === 'all' && !(await confirm({ title: 'Sign out everywhere?', description: 'You will be signed out of Screen on every device, including this one.', confirmLabel: 'Sign out everywhere', destructive: true }))) return
    setBusy(scope)
    try {
      await post('/api/account/sessions', { scope })
      if (scope === 'all') { window.location.href = '/interviews/login'; return }
      toast.success('Signed out of all other devices')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t sign out other sessions.') } finally { setBusy(null) }
  }

  return (
    <section className="lv-card lv-card--pad" aria-labelledby="acct-h">
      {confirmDialog}
      <h2 id="acct-h" className="lv-card__title">Your account &amp; sign-in</h2>
      <p style={sub}>Screen signs you in with a one-time code sent to your work email — there is no password to reset.</p>
      <div style={{ ...row, borderTop: 'none', paddingTop: 0 }}>
        <MailCheck size={16} color="var(--lv-text-muted)" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{email || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{verifiedAt ? `Confirmed ${new Date(verifiedAt).toLocaleString()}` : 'Sign-in email'}</div>
        </div>
        {step === 'idle'
          ? <Button size="sm" variant="secondary" loading={busy === 'send'} onClick={send}>Re-verify email</Button>
          : (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="lv-input" aria-label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code" style={{ width: 110, letterSpacing: 3 }} />
              <Button size="sm" loading={busy === 'verify'} disabled={code.length < 4} onClick={verify}>Confirm</Button>
              <Button size="sm" variant="tertiary" onClick={() => { setStep('idle'); setCode('') }}>Cancel</Button>
            </span>
          )}
      </div>
      <div style={row}>
        <LogOut size={16} color="var(--lv-text-muted)" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Sessions</div>
          <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Lost a laptop or signed in on a shared computer? End those sessions.</div>
        </div>
        <Button size="sm" variant="secondary" loading={busy === 'others'} onClick={() => signOut('others')}>Sign out other devices</Button>
        <Button size="sm" variant="tertiary" loading={busy === 'all'} onClick={() => signOut('all')}>Sign out everywhere</Button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '10px 0 0' }}>
        To change your sign-in email, ask a workspace admin to invite the new address, then they can remove the old one.
      </p>
    </section>
  )
}

/* ── Team & roles ────────────────────────────────────────────────────────── */
export function TeamManagement({ onAccess }: { onAccess?: (a: { canManage: boolean; role: ScreenRole | null }) => void }) {
  const [data, setData] = useState<{ canManage: boolean; me: string; users: Member[]; invites: Invite[] } | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ScreenRole>('recruiter')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirm()

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/agency/team', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setData(d)
      onAccess?.({ canManage: !!d.canManage, role: (d.users as Member[]).find((u) => u.id === d.me)?.role ?? null })
    } catch { setData({ canManage: false, me: '', users: [], invites: [] }) }
  }, [onAccess])
  useEffect(() => { void load() }, [load])

  const call = async (key: string, method: 'PATCH' | 'DELETE', body: unknown, ok: string) => {
    setBusy(key)
    try {
      const r = await fetch('/api/agency/team', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Something went wrong.')
      toast.success(ok); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong.') } finally { setBusy(null) }
  }
  const invite = async () => {
    setBusy('invite')
    try {
      const r = await fetch('/api/agency/invite-team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members: [{ email: email.trim(), role }] }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Couldn\'t send the invite.')
      toast.success(`Invite sent to ${email.trim()}`); setEmail(''); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t send the invite.') } finally { setBusy(null) }
  }

  if (!data) return <section className="lv-card lv-card--pad"><h2 className="lv-card__title">Team &amp; roles</h2><p style={sub}>Loading…</p></section>
  const admin = data.canManage

  return (
    <section className="lv-card lv-card--pad" aria-labelledby="team-h">
      {confirmDialog}
      <h2 id="team-h" className="lv-card__title">Team &amp; roles</h2>
      <p style={sub}>{admin ? 'Invite teammates by work email and choose what each role can do.' : 'People in this workspace. Only admins can invite members or change roles.'}</p>

      {data.users.map((u) => (
        <div key={u.id} style={row}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{u.name}{u.id === data.me && <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}> (you)</span>}</div>
            <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{u.email} · {ago(u.lastLoginAt)}</div>
          </div>
          {admin
            ? <select aria-label={`Role for ${u.email}`} value={u.role} disabled={busy === `role:${u.id}`} className="lv-select" style={sel}
                onChange={(e) => call(`role:${u.id}`, 'PATCH', { userId: u.id, role: e.target.value }, `${u.name} is now ${ROLE_INFO[e.target.value as ScreenRole].label}`)}>
                {SCREEN_ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
              </select>
            : <Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>{ROLE_INFO[u.role].label}</Badge>}
          {admin && u.id === data.me && <span aria-hidden="true" style={{ width: 32, flexShrink: 0 }} />}
          {admin && u.id !== data.me && (
            <Button size="sm" variant="ghost" iconOnly aria-label={`Remove ${u.email}`} loading={busy === `rm:${u.id}`}
              onClick={async () => {
                if (await confirm({ title: `Remove ${u.name}?`, description: `${u.email} loses access to this workspace immediately, on every device. Their interviews and reports stay.`, confirmLabel: 'Remove member', destructive: true })) void call(`rm:${u.id}`, 'DELETE', { userId: u.id }, 'Member removed')
              }}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ))}

      {data.invites.map((i) => (
        <div key={i.id} style={row}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{i.email}</div>
            <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Invited as {ROLE_INFO[i.role].label}{i.invitedAt ? ` · ${new Date(i.invitedAt).toLocaleDateString()}` : ''}</div>
          </div>
          <Badge tone={i.expired ? 'warning' : 'info'}>{i.expired ? 'Invite expired' : 'Pending'}</Badge>
          {admin && <>
            <Button size="sm" variant="secondary" leftIcon={<RefreshCw size={13} />} loading={busy === `re:${i.id}`} onClick={() => call(`re:${i.id}`, 'PATCH', { memberId: i.id }, 'Invite resent')}>Resend</Button>
            <Button size="sm" variant="ghost" iconOnly aria-label={`Revoke invite for ${i.email}`} loading={busy === `rv:${i.id}`} onClick={() => call(`rv:${i.id}`, 'DELETE', { memberId: i.id }, 'Invite revoked')}><Trash2 size={14} /></Button>
          </>}
        </div>
      ))}

      {admin && (
        <div style={{ ...row, gap: 8 }}>
          <UserPlus size={16} color="var(--lv-text-muted)" aria-hidden="true" />
          <input className="lv-input" type="email" aria-label="Teammate work email" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) void invite() }} style={{ flex: '1 1 220px', minWidth: 0 }} />
          <select aria-label="Role for the invite" value={role} onChange={(e) => setRole(e.target.value as ScreenRole)} className="lv-select" style={sel}>
            {SCREEN_ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
          </select>
          <Button size="sm" loading={busy === 'invite'} disabled={!email.trim()} onClick={invite}>Send invite</Button>
        </div>
      )}

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={13} aria-hidden="true" /> What each role can do</summary>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
          {SCREEN_ROLES.map((r) => <li key={r} style={{ fontSize: 12, color: 'var(--lv-text-body)' }}><strong>{ROLE_INFO[r].label}</strong> — {ROLE_INFO[r].summary}</li>)}
        </ul>
      </details>
      {admin && <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '10px 0 0' }}>Invites need a work email; new members sign in with an email code. Role changes and removals take effect on their next action.</p>}
    </section>
  )
}

/** Banner for non-admins on workspace settings. */
export function ReadOnlySettingsNotice({ role }: { role: ScreenRole | null }) {
  return (
    <Alert tone="info" title="Workspace settings are managed by admins">
      You&apos;re signed in as {role ? `a ${ROLE_INFO[role].label.toLowerCase()}` : 'a member'}. You can view these settings; ask a workspace admin to change them.
    </Alert>
  )
}
