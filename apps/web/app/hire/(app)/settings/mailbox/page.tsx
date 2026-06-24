'use client'
import { useEffect, useState, useCallback } from 'react'

interface Conn { id: string; email: string; provider: string; imapHost: string | null; imapPort: number | null; smtpHost: string | null; smtpPort: number | null; status: string; lastError: string | null; lastSyncedAt: string | null }
interface Msg { id: string; fromAddr: string; fromName: string | null; subject: string; snippet: string; receivedAt: string; isJobSpec: boolean; jobSpecConfidence: number | null; status: string; createdPositionId: string | null }
interface Brief { title: string; summary: string; responsibilities: string[]; mustHaveSkills: string[]; niceToHaveSkills: string[]; experience: string; screeningCriteria: string[]; suggestedInterviewFocus: string[] }

const HOSTINGER = { imapHost: 'imap.hostinger.com', imapPort: 993, smtpHost: 'smtp.hostinger.com', smtpPort: 465 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }

export default function MailboxSettingsPage() {
  const [conn, setConn] = useState<Conn | null>(null)
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(() => { fetch('/api/hire/mailbox').then((r) => (r.ok ? r.json() : null)).then((d) => { setConn(d?.connection ?? null); setLoaded(true) }).catch(() => setLoaded(true)) }, [])
  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 880 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Email / Mailbox</h1>
      <div style={{ fontSize: 13.5, color: '#475569', marginBottom: 20 }}>Connect your business mailbox to pull inbound mail (job specs → draft positions) and send candidate emails from your own address.</div>

      {!loaded ? <div style={{ color: '#475569' }}>Loading…</div>
        : conn && conn.status === 'connected'
          ? <Connected conn={conn} onChanged={load} />
          : <ConnectForm existing={conn} onConnected={load} />}
    </div>
  )
}

function ConnectForm({ existing, onConnected }: { existing: Conn | null; onConnected: () => void }) {
  const [f, setF] = useState({ email: existing?.email ?? '', imapHost: existing?.imapHost ?? HOSTINGER.imapHost, imapPort: String(existing?.imapPort ?? HOSTINGER.imapPort), smtpHost: existing?.smtpHost ?? HOSTINGER.smtpHost, smtpPort: String(existing?.smtpPort ?? HOSTINGER.smtpPort), password: '' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function connect() {
    setBusy(true); setErr('')
    const res = await fetch('/api/hire/mailbox/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, imapPort: Number(f.imapPort), smtpPort: Number(f.smtpPort) }) })
    setBusy(false)
    if (res.ok) onConnected(); else setErr((await res.json().catch(() => ({}))).error ?? 'Could not connect')
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, maxWidth: 560 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Connect a mailbox (IMAP / SMTP)</div>
      <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Use a business email. Create an app password in your mail provider. Defaults are pre-filled for Hostinger.</div>
      {existing?.status === 'error' && existing.lastError && <div style={{ fontSize: 12.5, color: '#B45309', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>Last attempt failed: {existing.lastError}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={lbl}>Business email</label><input style={inp} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@yourcompany.com" /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}><label style={lbl}>IMAP host</label><input style={inp} value={f.imapHost} onChange={(e) => set('imapHost', e.target.value)} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>IMAP port</label><input style={inp} value={f.imapPort} onChange={(e) => set('imapPort', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}><label style={lbl}>SMTP host</label><input style={inp} value={f.smtpHost} onChange={(e) => set('smtpHost', e.target.value)} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>SMTP port</label><input style={inp} value={f.smtpPort} onChange={(e) => set('smtpPort', e.target.value)} /></div>
        </div>
        <div><label style={lbl}>App password</label><input style={inp} type="password" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="App-specific password" autoComplete="new-password" /></div>
        {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
        <button onClick={connect} disabled={busy} style={{ alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 9, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{busy ? 'Testing connection…' : 'Connect & test'}</button>
        <div style={{ fontSize: 11.5, color: '#94A3B8' }}>🔒 Your password is verified, then encrypted at rest (AES-256-GCM). It is never stored in plain text, never shown again, and never sent back to the browser.</div>
      </div>
    </div>
  )
}

function Connected({ conn, onChanged }: { conn: Conn; onChanged: () => void }) {
  const [tab, setTab] = useState<'jobspec' | 'all'>('jobspec')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [syncing, setSyncing] = useState(false)
  const [draft, setDraft] = useState<Msg | null>(null)
  const [note, setNote] = useState('')

  const loadMsgs = useCallback(() => { fetch(`/api/hire/mailbox/messages${tab === 'jobspec' ? '?filter=jobspec' : ''}`).then((r) => (r.ok ? r.json() : null)).then((d) => setMsgs(d?.messages ?? [])).catch(() => {}) }, [tab])
  useEffect(() => { loadMsgs() }, [loadMsgs])

  async function refresh() {
    setSyncing(true); setNote('')
    const res = await fetch('/api/hire/mailbox/sync', { method: 'POST' })
    const d = await res.json().catch(() => ({}))
    setSyncing(false)
    setNote(res.ok ? `Synced — ${d.newCount ?? 0} new message(s).` : (d.error ?? 'Sync failed'))
    onChanged(); loadMsgs()
  }
  async function disconnect() { if (!confirm('Disconnect this mailbox? Stored credentials are deleted.')) return; await fetch('/api/hire/mailbox', { method: 'DELETE' }); onChanged() }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#059669' }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{conn.email}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Connected · {conn.imapHost} · last synced {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString('en-IN') : 'never'}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={refresh} disabled={syncing} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{syncing ? 'Syncing…' : '↻ Refresh'}</button>
          <button onClick={disconnect} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#DC2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Disconnect</button>
        </div>
      </div>
      {note && <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 12 }}>{note}</div>}

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 14 }}>
        {(['jobspec', 'all'] as const).map((t) => <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 14px', fontSize: 13.5, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t ? '#6D28D9' : 'transparent'), color: tab === t ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>{t === 'jobspec' ? 'Job specs' : 'All mail'}</button>)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.length === 0 && <div style={{ fontSize: 13, color: '#94A3B8', padding: '20px 0' }}>No {tab === 'jobspec' ? 'job-spec ' : ''}messages yet. Hit Refresh to pull your inbox.</div>}
        {[...msgs].sort((a, b) => (tab === 'jobspec' ? (b.jobSpecConfidence ?? 0) - (a.jobSpecConfidence ?? 0) : 0)).map((m) => {
          const highConf = (m.jobSpecConfidence ?? 0) >= 75
          return (
          <div key={m.id} style={{ background: '#fff', border: `1px solid ${m.isJobSpec && m.status !== 'drafted' ? '#DDD6FE' : '#E2E8F0'}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{m.subject}</span>
              {m.isJobSpec && <span style={{ fontSize: 10, fontWeight: 800, color: '#6D28D9', background: 'rgba(109,40,217,0.10)', borderRadius: 100, padding: '2px 9px' }}>📋 Looks like a job requisition{m.jobSpecConfidence != null ? ` · ${m.jobSpecConfidence}%` : ''}</span>}
              {m.status === 'drafted' && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>✓ position created</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>{new Date(m.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{m.fromName ? `${m.fromName} · ` : ''}{m.fromAddr}</div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>{m.snippet}</div>
            {m.status !== 'drafted' && m.isJobSpec && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setDraft(m)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: highConf ? '#6D28D9' : '#fff', color: highConf ? '#fff' : '#6D28D9', boxShadow: highConf ? 'none' : 'inset 0 0 0 1px #6D28D9', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>✨ Create position from this email</button>
              </div>
            )}
            {m.createdPositionId && <a href={`/hire/jobs/${m.createdPositionId}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}>Open created job →</a>}
          </div>
          )
        })}
      </div>

      {draft && <DraftModal msg={draft} onClose={() => setDraft(null)} onDone={() => { setDraft(null); loadMsgs() }} />}
    </div>
  )
}

interface Hints { role: string | null; positions: number | null; billRate: number | null; currency: string | null; hoursPerWeek: number | null; durationValue: number | null; durationUnit: 'weeks' | 'months' | null; location: string | null }
// Months→weeks (52/12) for the deal-size preview, matching the CRM deal-math.
function dealSize(h: Hints): number | null {
  if (!(h.positions && h.billRate && h.hoursPerWeek && h.durationValue)) return null
  const weeks = h.durationUnit === 'months' ? h.durationValue * (52 / 12) : h.durationValue
  return Math.round(h.positions * h.billRate * h.hoursPerWeek * weeks)
}

function DraftModal({ msg, onClose, onDone }: { msg: Msg; onClose: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'review' | 'saving' | 'error'>('loading')
  const [brief, setBrief] = useState<Brief | null>(null)
  const [title, setTitle] = useState('')
  const [hints, setHints] = useState<Hints | null>(null)
  const [client, setClient] = useState<{ id: string; name: string } | null>(null)
  const [makeDeal, setMakeDeal] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const detail = await fetch(`/api/hire/mailbox/messages/${msg.id}`).then((r) => r.json())
        const senderCtx = `From: ${detail.fromName ? `${detail.fromName} ` : ''}<${detail.fromAddr}>\nSubject: ${detail.subject}\n\n${detail.bodyText?.slice(0, 6000) ?? ''}`
        // Brief + structured hints in parallel (hints best-effort).
        const [briefRes, hintsRes] = await Promise.all([
          fetch('/api/hire/jobs/generate-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: detail.subject?.replace(/^(re|fwd):\s*/i, '').trim() || 'New role', notes: senderCtx }) }),
          fetch(`/api/hire/mailbox/messages/${msg.id}/hints`, { method: 'POST' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ])
        const d = await briefRes.json()
        if (!briefRes.ok) { setErr(d.error ?? 'Could not draft a brief'); setPhase('error'); return }
        setBrief(d.brief); setTitle(d.brief.title)
        if (hintsRes?.hints) { setHints(hintsRes.hints); setClient(hintsRes.client ?? null) }
        setPhase('review')
      } catch { setErr('Network error'); setPhase('error') }
    })()
  }, [msg.id])

  async function createJob() {
    if (!brief) return
    setPhase('saving'); setErr('')
    const description = [brief.summary, brief.responsibilities?.length ? '\nResponsibilities:\n- ' + brief.responsibilities.join('\n- ') : '', brief.experience ? `\nExperience: ${brief.experience}` : ''].filter(Boolean).join('\n')
    // Pre-fill a weighted rubric from the AI skills (recruiter can tune later).
    const rubric = [
      ...(brief.mustHaveSkills ?? []).map((skill) => ({ skill, weight: 4, required: true })),
      ...(brief.niceToHaveSkills ?? []).map((skill) => ({ skill, weight: 2, required: false })),
    ]
    const res = await fetch('/api/hire/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, mustHaveSkills: brief.mustHaveSkills, niceToHaveSkills: brief.niceToHaveSkills, screeningCriteria: brief.screeningCriteria, interviewFocus: brief.suggestedInterviewFocus, location: hints?.location ?? undefined, rubric, aiGenerated: true }) })
    const job = await res.json()
    if (!res.ok) { setErr(job.error ?? 'Failed to create job'); setPhase('review'); return }

    // Optional: linked CRM deal pre-filled with the detected economics (needs a matched client).
    if (makeDeal && client && hints && dealSize(hints) != null) {
      await fetch('/api/hire/crm/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        clientId: client.id, title: `${title} — ${hints.positions} role${(hints.positions ?? 0) > 1 ? 's' : ''}`,
        jobIds: [job.id], positions: hints.positions, billRate: hints.billRate, hoursPerWeek: hints.hoursPerWeek,
        durationValue: hints.durationValue, durationUnit: hints.durationUnit ?? 'months',
      }) }).catch(() => {})
    }

    await fetch(`/api/hire/mailbox/messages/${msg.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'drafted', createdPositionId: job.id }) })
    window.location.href = `/hire/jobs/${job.id}`
    onDone()
  }

  const size = hints ? dealSize(hints) : null
  const econ = hints && (hints.positions || hints.billRate || hints.durationValue)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 580, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Create position from email</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Review &amp; edit the AI-drafted position. Nothing is created until you approve.</div>
        {phase === 'loading' && <div style={{ color: '#475569', padding: '20px 0' }}>✨ Reading the email and drafting a position…</div>}
        {phase === 'error' && <div style={{ color: '#DC2626' }}>{err}</div>}
        {(phase === 'review' || phase === 'saving') && brief && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={lbl}>Title</label><input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label style={lbl}>Summary</label><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{brief.summary}</div></div>
            {brief.mustHaveSkills?.length > 0 && <div><label style={lbl}>Must-have skills → rubric</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{brief.mustHaveSkills.map((s) => <span key={s} style={{ fontSize: 11.5, background: '#F1F5F9', color: '#475569', borderRadius: 100, padding: '3px 9px' }}>{s}</span>)}</div></div>}
            {(brief.experience || hints?.location) && <div style={{ fontSize: 12.5, color: '#475569' }}>{brief.experience ? `Experience: ${brief.experience}` : ''}{brief.experience && hints?.location ? ' · ' : ''}{hints?.location ? `Location: ${hints.location}` : ''}</div>}

            {econ && (
              <div style={{ background: '#FBFAFF', border: '1px solid #EDE9FE', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9', marginBottom: 6 }}>Detected from the email</div>
                <div style={{ fontSize: 12.5, color: '#475569' }}>
                  {[hints?.positions ? `${hints.positions} position${hints.positions > 1 ? 's' : ''}` : null, hints?.billRate ? `${hints.currency === 'USD' ? '$' : ''}${hints.billRate}/hr` : null, hints?.hoursPerWeek ? `${hints.hoursPerWeek} hrs/wk` : null, hints?.durationValue ? `${hints.durationValue} ${hints.durationUnit ?? 'months'}` : null].filter(Boolean).join(' · ')}
                  {size != null && <span style={{ fontWeight: 700, color: '#6D28D9' }}> → deal size ≈ ₹{size.toLocaleString('en-IN')}</span>}
                </div>
                {client && size != null
                  ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, color: '#475569', cursor: 'pointer' }}><input type="checkbox" checked={makeDeal} onChange={(e) => setMakeDeal(e.target.checked)} /> Also create a linked CRM deal for <strong>{client.name}</strong></label>
                  : size != null ? <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 8 }}>No matching CRM client for this sender — add a deal manually in CRM if needed.</div> : null}
              </div>
            )}

            {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createJob} disabled={phase === 'saving'} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{phase === 'saving' ? 'Creating…' : 'Approve & create position'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
