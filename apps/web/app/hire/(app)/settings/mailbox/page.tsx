'use client'
import { useEffect, useState, useCallback } from 'react'

interface Conn { id: string; email: string; provider: string; imapHost: string | null; imapPort: number | null; smtpHost: string | null; smtpPort: number | null; status: string; lastError: string | null; lastSyncedAt: string | null }

const HOSTINGER = { imapHost: 'imap.hostinger.com', imapPort: 993, smtpHost: 'smtp.hostinger.com', smtpPort: 465 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }

export default function MailboxSettingsPage() {
  const [conn, setConn] = useState<Conn | null>(null)
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(() => { fetch('/api/hire/mailbox').then((r) => (r.ok ? r.json() : null)).then((d) => { setConn(d?.connection ?? null); setLoaded(true) }).catch(() => setLoaded(true)) }, [])
  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Email / Mailbox</h1>
      <div style={{ fontSize: 13.5, color: '#475569', marginBottom: 20 }}>Connect your business mailbox here. Day-to-day mail — reading, replying and turning job specs into positions — lives in the <a href="/hire/inbox" style={{ color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}>Inbox</a> tab.</div>

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
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }}>
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
  async function disconnect() { if (!confirm('Disconnect this mailbox? Stored credentials are deleted.')) return; await fetch('/api/hire/mailbox', { method: 'DELETE' }); onChanged() }
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#059669' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{conn.email}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Connected · {conn.imapHost} · last synced {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString('en-IN') : 'never'}</div>
        </div>
        <button onClick={disconnect} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#DC2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Disconnect</button>
      </div>
      <a href="/hire/inbox" style={{ display: 'inline-block', marginTop: 14, padding: '9px 16px', borderRadius: 9, background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Open Inbox →</a>
    </div>
  )
}
