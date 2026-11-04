'use client'
import { useEffect, useState, useCallback } from 'react'
import { useConfirm, Alert } from '@/components/screen/ui'

// Interviews app — "Integrations". Connect an external ATS (or HirePilot),
// fetch jobs + candidates into Interviews, run a sync, see last-synced status.

interface CredField { key: string; label: string; type?: string }
interface Provider {
  provider: string; label: string; authType: string; implemented: boolean
  credentialFields?: CredField[]
  connection: { id: string; status: string; lastSyncedAt: string | null; lastError: string | null; account: string | null } | null
}
interface SyncSummary { jobs: { created: number; updated: number }; candidates: { created: number; updated: number; skipped: number }; errors: string[] }

const card: React.CSSProperties = { background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 20, marginBottom: 14 }

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [summary, setSummary] = useState<Record<string, SyncSummary>>({})
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [confirm, confirmDialog] = useConfirm()

  const load = useCallback(() => {
    fetch('/api/interviews/integrations').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d) => { if (d?.providers) setProviders(d.providers); setLoadState('ok') }).catch(() => setLoadState('error'))
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
    if (!(await confirm({ title: 'Disconnect this integration?', description: 'Imported jobs and candidates stay in Levl1. You can reconnect any time.', confirmLabel: 'Disconnect', destructive: true }))) return
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
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 4px' }}>Integrations</h1>
      <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: '0 0 24px' }}>Connect your ATS (or HirePilot) to pull jobs and candidates into Interviews, then generate questions and run screening interviews.</p>
      {err && <Alert tone="danger" style={{ marginBottom: 14 }}>{err}</Alert>}

      {confirmDialog}
      {loadState === 'loading' && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--lv-text-muted)' }}><span className="lv-spinner" aria-hidden="true" style={{ color: 'var(--lv-brand)' }} /> Loading…</div>}
      {loadState === 'error' && <Alert tone="danger" title="Couldn't load integrations" action={<button type="button" className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => { setLoadState('loading'); load() }}>Retry</button>}>Check your connection and try again.</Alert>}
      {providers.map((p) => (
        <div key={p.provider} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)' }}>{p.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', background: 'var(--lv-surface-muted)', borderRadius: 100, padding: '2px 8px' }}>{p.authType === 'oauth' ? 'OAuth' : 'API key'}</span>
                {!p.implemented && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)' }}>coming soon</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--lv-text-body)', marginTop: 3 }}>
                {p.connection
                  ? <>Connected{p.connection.account ? ` · ${p.connection.account}` : ''} · {p.connection.lastSyncedAt ? `last sync ${new Date(p.connection.lastSyncedAt).toLocaleString('en-IN')}` : 'never synced'}{p.connection.status === 'error' && p.connection.lastError ? ` · Error: ${p.connection.lastError}` : ''}</>
                  : p.implemented ? 'Not connected' : 'Available later'}
              </div>
            </div>
            {!p.connection && p.implemented && <button className="lv-btn lv-btn--primary lv-btn--sm" onClick={() => { setOpenFor(openFor === p.provider ? null : p.provider); setCreds({}); setErr('') }}>Connect</button>}
            {p.connection && (
              <>
                <button className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => sync(p)} disabled={busy === 'sync-' + p.provider}>{busy === 'sync-' + p.provider ? 'Syncing…' : 'Sync now'}</button>
                <button className="lv-btn lv-btn--secondary lv-btn--sm" style={{ color: 'var(--lv-danger)' }} onClick={() => disconnect(p.connection!.id)}>Disconnect</button>
              </>
            )}
          </div>

          {openFor === p.provider && p.credentialFields && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--lv-surface-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.credentialFields.map((f) => (
                <input key={f.key} className="lv-input" type={f.type === 'password' ? 'password' : 'text'} aria-label={f.label} placeholder={f.label} value={creds[f.key] ?? ''} onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))} />
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="lv-btn lv-btn--primary lv-btn--sm" onClick={() => connect(p)} disabled={busy === 'connect-' + p.provider}>{busy === 'connect-' + p.provider ? 'Validating…' : 'Connect & validate'}</button>
                <button className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => setOpenFor(null)}>Cancel</button>
              </div>
              {p.provider === 'levl1_hire' && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Generate a key in HirePilot → Settings → Developers, then paste it here.</div>}
            </div>
          )}

          {summary[p.provider] && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--lv-surface-muted)', fontSize: 13, color: 'var(--lv-text-body)' }}>
              Jobs: <strong>{summary[p.provider].jobs.created}</strong> new, {summary[p.provider].jobs.updated} updated · Candidates: <strong>{summary[p.provider].candidates.created}</strong> new, {summary[p.provider].candidates.updated} updated, {summary[p.provider].candidates.skipped} skipped
              {summary[p.provider].errors.length > 0 && <div style={{ color: 'var(--lv-danger)', marginTop: 4 }}>{summary[p.provider].errors.join('; ')}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
