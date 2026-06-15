'use client'
import { useEffect, useState, useCallback } from 'react'

// Interviews app — "Integrations". Connect an external ATS (or Levl1 Hire),
// fetch jobs + candidates into Interviews, run a sync, see last-synced status.

interface CredField { key: string; label: string; type?: string }
interface Provider {
  provider: string; label: string; authType: string; implemented: boolean
  credentialFields?: CredField[]
  connection: { id: string; status: string; lastSyncedAt: string | null; lastError: string | null; account: string | null } | null
}
interface SyncSummary { jobs: { created: number; updated: number }; candidates: { created: number; updated: number; skipped: number }; errors: string[] }

const ACCENT = '#4F46E5'
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 14 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { ...inp, width: 'auto', fontWeight: 600, color: '#475569', cursor: 'pointer' }

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [summary, setSummary] = useState<Record<string, SyncSummary>>({})

  const load = useCallback(() => {
    fetch('/api/interviews/integrations').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.providers) setProviders(d.providers) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function connect(p: Provider) {
    setBusy('connect-' + p.provider); setErr('')
    try {
      const res = await fetch('/api/interviews/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: p.provider, credentials: creds }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not connect'); return }
      setOpenFor(null); setCreds({}); load()
    } finally { setBusy('') }
  }
  async function disconnect(id: string) {
    if (!confirm('Disconnect this integration? Imported jobs/candidates stay.')) return
    await fetch(`/api/interviews/integrations/${id}`, { method: 'DELETE' }); load()
  }
  async function sync(p: Provider) {
    if (!p.connection) return
    setBusy('sync-' + p.provider); setErr('')
    try {
      const res = await fetch(`/api/interviews/integrations/${p.connection.id}/sync`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) setSummary((s) => ({ ...s, [p.provider]: d }))
      load()
    } finally { setBusy('') }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Integrations</h1>
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 24px' }}>Connect your ATS (or Levl1 Hire) to pull jobs and candidates into Interviews, then generate questions and run screening interviews.</p>
      {err && <div style={{ ...card, borderColor: '#FECACA', color: '#DC2626', fontSize: 13 }}>{err}</div>}

      {providers.map((p) => (
        <div key={p.provider} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>{p.label}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>{p.authType === 'oauth' ? 'OAuth' : 'API key'}</span>
                {!p.implemented && <span style={{ fontSize: 10.5, fontWeight: 600, color: '#94A3B8' }}>coming soon</span>}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                {p.connection
                  ? <>Connected{p.connection.account ? ` · ${p.connection.account}` : ''} · {p.connection.lastSyncedAt ? `last sync ${new Date(p.connection.lastSyncedAt).toLocaleString('en-IN')}` : 'never synced'}{p.connection.status === 'error' && p.connection.lastError ? ` · ⚠ ${p.connection.lastError}` : ''}</>
                  : p.implemented ? 'Not connected' : 'Available later'}
              </div>
            </div>
            {!p.connection && p.implemented && <button style={btn} onClick={() => { setOpenFor(openFor === p.provider ? null : p.provider); setCreds({}); setErr('') }}>Connect</button>}
            {p.connection && (
              <>
                <button style={ghost} onClick={() => sync(p)} disabled={busy === 'sync-' + p.provider}>{busy === 'sync-' + p.provider ? 'Syncing…' : 'Sync now'}</button>
                <button style={{ ...ghost, color: '#DC2626' }} onClick={() => disconnect(p.connection!.id)}>Disconnect</button>
              </>
            )}
          </div>

          {openFor === p.provider && p.credentialFields && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.credentialFields.map((f) => (
                <input key={f.key} style={inp} type={f.type === 'password' ? 'password' : 'text'} placeholder={f.label} value={creds[f.key] ?? ''} onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))} />
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn} onClick={() => connect(p)} disabled={busy === 'connect-' + p.provider}>{busy === 'connect-' + p.provider ? 'Validating…' : 'Connect & validate'}</button>
                <button style={ghost} onClick={() => setOpenFor(null)}>Cancel</button>
              </div>
              {p.provider === 'levl1_hire' && <div style={{ fontSize: 11.5, color: '#64748B' }}>Generate a key in Levl1 Hire → Settings → Developers, then paste it here.</div>}
            </div>
          )}

          {summary[p.provider] && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', fontSize: 12.5, color: '#334155' }}>
              Jobs: <strong>{summary[p.provider].jobs.created}</strong> new, {summary[p.provider].jobs.updated} updated · Candidates: <strong>{summary[p.provider].candidates.created}</strong> new, {summary[p.provider].candidates.updated} updated, {summary[p.provider].candidates.skipped} skipped
              {summary[p.provider].errors.length > 0 && <div style={{ color: '#DC2626', marginTop: 4 }}>{summary[p.provider].errors.join('; ')}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
