'use client'
import { useCallback, useEffect, useState } from 'react'
import { HIRE_ROLES, ROLE_LABEL, ROLE_DESCRIPTION } from '@/lib/hire/roles'

interface Member { id: string; name: string; email: string; role: string; status: 'active' | 'invited' | 'disabled'; lastLoginAt: string | null; disabled: boolean }
interface Workload { jobs: number; candidates: number; clients: number }

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—')
const fmtFull = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never signed in')
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }
const ghost: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }

const STATUS = {
  active: { c: '#059669', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  invited: { c: '#B45309', bg: 'rgba(245,158,11,0.12)', label: 'Invited' },
  disabled: { c: '#64748B', bg: '#F1F5F9', label: 'Disabled' },
}

const DAY = 86400000
// Teams-style presence from last-login recency. Green = active recently,
// amber = idle beyond a day, grey/✕ = never or no recent session.
function presence(m: Member): { color: string; label: string; cross: boolean } {
  if (m.disabled) return { color: '#94A3B8', label: 'Disabled', cross: true }
  if (!m.lastLoginAt) return { color: '#CBD5E1', label: 'Not logged in', cross: true }
  const days = (Date.now() - new Date(m.lastLoginAt).getTime()) / DAY
  if (days <= 1) return { color: '#22C55E', label: 'Available', cross: false }
  if (days <= 14) return { color: '#F59E0B', label: 'Inactive', cross: false }
  return { color: '#CBD5E1', label: 'Not logged in', cross: true } // no recent session
}
function relative(iso: string | null): string {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return fmtDate(iso)
}

// Team → Members. Admins manage roles/invites/removals; managers view read-only.
export function TeamMembers({ isAdmin }: { isAdmin: boolean }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [removeFor, setRemoveFor] = useState<Member | null>(null)
  const [disableFor, setDisableFor] = useState<Member | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')

  async function enableMember(m: Member) {
    setBusy(m.id); setNote('')
    const res = await fetch(`/api/hire/team/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disabled: false }) })
    const d = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setNote(d.error ?? 'Could not enable member'); return }
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, disabled: false, status: 'active' } : x)))
    setNote(`${m.name || m.email} is now active — they can sign in again.`)
  }

  const load = useCallback(() => {
    fetch('/api/hire/team').then((r) => (r.ok ? r.json() : [])).then((d) => { if (Array.isArray(d)) setMembers(d); setLoaded(true) }).catch(() => setLoaded(true))
  }, [])
  useEffect(() => { load() }, [load])

  async function changeRole(m: Member, role: string) {
    if (role === m.role) return
    setBusy(m.id); setNote('')
    const res = await fetch(`/api/hire/team/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    const d = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setNote(d.error ?? 'Could not change role'); return }
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, role } : x)))
    // Server authorization reads the role live from the DB, so this is effective
    // immediately on their next request — no re-login needed (they may need to
    // refresh their tab to see newly-available menus).
    setNote(`${m.name || m.email} is now ${ROLE_LABEL[role] ?? role} — effective immediately (they may need to refresh their tab for new menus).`)
  }

  if (!loaded) return <div style={{ color: '#475569' }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#64748B' }}>{members.length} member{members.length !== 1 ? 's' : ''}{isAdmin ? '' : ' · view-only (admins manage roles)'}</div>
        {isAdmin && <button onClick={() => setShowInvite(true)} style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Invite member</button>}
      </div>

      {note && <div style={{ fontSize: 13, color: note.includes('now') ? '#059669' : '#DC2626', marginBottom: 10 }}>{note}</div>}

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 110px 190px', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5F9', fontSize: 11.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Member</span><span>Role</span><span>Status</span><span>Last login</span><span></span>
        </div>
        {members.map((m) => {
          const st = STATUS[m.status] ?? STATUS.active
          const pr = presence(m)
          return (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 110px 190px', gap: 10, alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #F8FAFC', opacity: m.disabled ? 0.62 : 1 }}>
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                {/* Teams-style presence dot */}
                <span title={`${pr.label} · last login ${fmtFull(m.lastLoginAt)}`} style={{ flexShrink: 0, width: 10, height: 10, borderRadius: '50%', background: pr.color, boxShadow: pr.cross ? 'none' : `0 0 0 3px ${pr.color}22`, position: 'relative' }}>
                  {pr.cross && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 900, lineHeight: 1 }}>×</span>}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || '—'}</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                </div>
              </div>
              <div>
                {isAdmin && !m.disabled ? (
                  <select value={m.role} disabled={busy === m.id} onChange={(e) => changeRole(m, e.target.value)} title={ROLE_DESCRIPTION[m.role as keyof typeof ROLE_DESCRIPTION]} style={{ ...inp, padding: '6px 8px', fontWeight: 600, cursor: 'pointer', width: 'auto' }}>
                    {HIRE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                ) : <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{ROLE_LABEL[m.role] ?? m.role}</span>}
              </div>
              <div title={pr.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: st.c, background: st.bg, padding: '2px 9px', borderRadius: 100 }}>{st.label}</span>
              </div>
              <div title={fmtFull(m.lastLoginAt)} style={{ fontSize: 12.5, color: '#64748B', cursor: 'default' }}>{relative(m.lastLoginAt)}</div>
              <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {isAdmin && (m.disabled
                  ? <button onClick={() => enableMember(m)} disabled={busy === m.id} style={{ ...ghost, color: '#059669', borderColor: 'rgba(5,150,105,0.3)' }}>Enable</button>
                  : <button onClick={() => setDisableFor(m)} style={{ ...ghost }}>Disable</button>)}
                {isAdmin && <button onClick={() => setRemoveFor(m)} title="Remove permanently" style={{ ...ghost, color: '#DC2626', borderColor: 'rgba(220,38,38,0.25)' }}>Remove</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showInvite && isAdmin && <InviteModal onClose={() => setShowInvite(false)} onDone={() => { setShowInvite(false); load() }} />}
      {removeFor && isAdmin && <RemoveModal member={removeFor} others={members.filter((x) => x.id !== removeFor.id)} onClose={() => setRemoveFor(null)} onDone={() => { setRemoveFor(null); load() }} />}
      {disableFor && isAdmin && <DisableModal member={disableFor} others={members.filter((x) => x.id !== disableFor.id && !x.disabled)} onClose={() => setDisableFor(null)} onDone={() => { setDisableFor(null); load() }} />}
    </div>
  )
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('RECRUITER')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  // When the member row was created but the email didn't send, surface the link.
  const [linkFallback, setLinkFallback] = useState<{ url: string; reason: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function send() {
    setErr('')
    if (!name.trim() || !email.trim()) { setErr('Name and email are required'); return }
    setSaving(true)
    const res = await fetch('/api/hire/auth/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, role }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setErr(d.message ?? d.error ?? 'Could not send invite'); return }
    if (d.emailSent === false && d.inviteUrl) { setLinkFallback({ url: d.inviteUrl, reason: d.emailError ?? 'the email could not be delivered' }); return }
    onDone()
  }

  if (linkFallback) {
    return (
      <Modal title="Member added — email didn't send" subtitle="The invite couldn't be emailed. Share this secure invite link with them directly." onClose={onDone}>
        <div style={{ fontSize: 12.5, color: '#92400E', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: 10 }}>Reason: {linkFallback.reason}</div>
        <input readOnly value={linkFallback.url} onFocus={(e) => e.currentTarget.select()} style={{ ...inp, fontSize: 12, fontFamily: 'monospace' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { navigator.clipboard?.writeText(linkFallback.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Copy invite link'}</button>
          <button onClick={onDone} style={{ ...ghost, flex: 1, padding: 10 }}>Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Invite team member" subtitle="They'll get an email with a link to set a password and join." onClose={onClose}>
      <div><label style={lbl}>Name</label><input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></div>
      <div><label style={lbl}>Work email</label><input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" /></div>
      <div>
        <label style={lbl}>Role</label>
        <select style={inp} value={role} onChange={(e) => setRole(e.target.value)}>
          {HIRE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]} — {ROLE_DESCRIPTION[r]}</option>)}
        </select>
      </div>
      {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onClose} style={{ ...ghost, flex: 1, padding: 10 }}>Cancel</button>
        <button onClick={send} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Sending…' : 'Send invite'}</button>
      </div>
    </Modal>
  )
}

function RemoveModal({ member, others, onClose, onDone }: { member: Member; others: Member[]; onClose: () => void; onDone: () => void }) {
  const [wl, setWl] = useState<Workload | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/hire/team/${member.id}`).then((r) => (r.ok ? r.json() : null)).then((d) => setWl(d?.workload ?? { jobs: 0, candidates: 0, clients: 0 })).catch(() => setWl({ jobs: 0, candidates: 0, clients: 0 }))
  }, [member.id])

  const hasWork = !!wl && (wl.jobs + wl.candidates + wl.clients) > 0

  async function remove() {
    setErr(''); setSaving(true)
    const res = await fetch(`/api/hire/team/${member.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reassignTo ? { reassignToUserId: reassignTo } : {}) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setErr(d.error ?? 'Could not remove member'); return }
    onDone()
  }

  return (
    <Modal title={`Remove ${member.name || member.email}?`} subtitle="They lose access immediately. This can't be undone." onClose={onClose}>
      {wl === null ? <div style={{ color: '#475569', fontSize: 13 }}>Checking their assigned work…</div> : hasWork ? (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12.5, color: '#92400E', marginBottom: 8 }}>
            {member.name || 'This member'} owns <strong>{wl.jobs} job{wl.jobs !== 1 ? 's' : ''}</strong>, <strong>{wl.candidates} candidate{wl.candidates !== 1 ? 's' : ''}</strong> and <strong>{wl.clients} client{wl.clients !== 1 ? 's' : ''}</strong>. Reassign their work so nothing is orphaned:
          </div>
          <label style={lbl}>Reassign to</label>
          <select style={inp} value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
            <option value="">Leave unassigned (put back in the pool)</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name || o.email} — {ROLE_LABEL[o.role] ?? o.role}</option>)}
          </select>
        </div>
      ) : <div style={{ fontSize: 13, color: '#475569' }}>This member has no assigned jobs, candidates or clients.</div>}
      {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onClose} style={{ ...ghost, flex: 1, padding: 10 }}>Cancel</button>
        <button onClick={remove} disabled={saving || wl === null} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Removing…' : 'Remove member'}</button>
      </div>
    </Modal>
  )
}

function DisableModal({ member, others, onClose, onDone }: { member: Member; others: Member[]; onClose: () => void; onDone: () => void }) {
  const [wl, setWl] = useState<Workload | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/hire/team/${member.id}`).then((r) => (r.ok ? r.json() : null)).then((d) => setWl(d?.workload ?? { jobs: 0, candidates: 0, clients: 0 })).catch(() => setWl({ jobs: 0, candidates: 0, clients: 0 }))
  }, [member.id])

  const hasWork = !!wl && (wl.jobs + wl.candidates + wl.clients) > 0

  async function disable() {
    setErr(''); setSaving(true)
    const res = await fetch(`/api/hire/team/${member.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: true, ...(reassignTo ? { reassignToUserId: reassignTo } : {}) }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setErr(d.error ?? 'Could not disable member'); return }
    onDone()
  }

  return (
    <Modal title={`Disable ${member.name || member.email}?`} subtitle="They can't sign in and won't appear in assignment dropdowns. Their record and history are kept — you can re-enable them anytime." onClose={onClose}>
      {wl === null ? <div style={{ color: '#475569', fontSize: 13 }}>Checking their assigned work…</div> : hasWork ? (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12.5, color: '#92400E', marginBottom: 8 }}>
            {member.name || 'This member'} owns <strong>{wl.jobs} job{wl.jobs !== 1 ? 's' : ''}</strong>, <strong>{wl.candidates} candidate{wl.candidates !== 1 ? 's' : ''}</strong> and <strong>{wl.clients} client{wl.clients !== 1 ? 's' : ''}</strong>. Reassign their work so nothing is left unattended (optional):
          </div>
          <label style={lbl}>Reassign to</label>
          <select style={inp} value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
            <option value="">Keep as-is (leave assigned to them)</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name || o.email} — {ROLE_LABEL[o.role] ?? o.role}</option>)}
          </select>
        </div>
      ) : <div style={{ fontSize: 13, color: '#475569' }}>This member has no assigned jobs, candidates or clients.</div>}
      {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onClose} style={{ ...ghost, flex: 1, padding: 10 }}>Cancel</button>
        <button onClick={disable} disabled={saving || wl === null} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#B45309', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Disabling…' : 'Disable member'}</button>
      </div>
    </Modal>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>{subtitle}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}
