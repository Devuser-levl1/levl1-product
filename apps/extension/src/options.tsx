import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getSettings, saveSettings } from './storage'
import { validateKey, listJobs, AuthError } from './api'
import { Job, Settings, DEFAULT_BASE_URL } from './types'

const PURPLE = '#6D28D9'
const I: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, marginTop: 6, boxSizing: 'border-box' }
const L: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#475569' }

function App() {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
  const [defaultJobId, setDefaultJobId] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; msg: string }>({ kind: 'idle', msg: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => { getSettings().then((s) => { setApiKey(s.apiKey); setBaseUrl(s.baseUrl); setDefaultJobId(s.defaultJobId); if (s.apiKey) refreshJobs({ ...s }) }) }, [])

  async function refreshJobs(s: Settings) {
    try { setJobs(await listJobs(s)) } catch { /* ignore — surfaced on validate */ }
  }

  async function validateAndSave() {
    setBusy(true); setStatus({ kind: 'idle', msg: '' })
    const s: Settings = { apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || DEFAULT_BASE_URL, defaultJobId }
    try {
      await validateKey(s)
      await saveSettings(s)
      await refreshJobs(s)
      setStatus({ kind: 'ok', msg: 'API key validated and saved.' })
    } catch (e) {
      if (e instanceof AuthError) setStatus({ kind: 'err', msg: 'Invalid or revoked API key.' })
      else setStatus({ kind: 'err', msg: e instanceof Error ? e.message : 'Could not validate key.' })
    } finally { setBusy(false) }
  }

  async function saveJob(id: string) {
    setDefaultJobId(id)
    const s = await getSettings()
    await saveSettings({ ...s, defaultJobId: id })
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${PURPLE}, #2563EB)`, transform: 'rotate(45deg)' }} />
        <h1 style={{ fontSize: 18, margin: 0 }}>Levl1 Capture — Setup</h1>
      </div>
      <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginTop: 8 }}>
        Paste your tenant API key from Levl1 Hire → Settings → Developers. It is stored only in this browser
        (<code>chrome.storage.local</code>) and sent only to your Levl1 API.
      </p>

      <div style={{ marginTop: 16 }}><span style={L}>API key</span>
        <input style={I} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="lvl1_…" />
      </div>
      <div style={{ marginTop: 14 }}><span style={L}>API base URL</span>
        <input style={I} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={DEFAULT_BASE_URL} />
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>Default {DEFAULT_BASE_URL}. Change only for self-hosted/staging.</div>
      </div>

      <button onClick={validateAndSave} disabled={busy || !apiKey.trim()} style={{ ...I, background: PURPLE, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 16 }}>
        {busy ? 'Validating…' : 'Validate & save'}
      </button>
      {status.kind !== 'idle' && <div style={{ fontSize: 13, marginTop: 10, color: status.kind === 'ok' ? '#059669' : '#DC2626' }}>{status.msg}</div>}

      <div style={{ marginTop: 22, borderTop: '1px solid #F1F5F9', paddingTop: 18 }}>
        <span style={L}>Default job for interviews (optional)</span>
        <select style={I} value={defaultJobId} onChange={(e) => saveJob(e.target.value)} disabled={jobs.length === 0}>
          <option value="">No default — use inline role title</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>{jobs.length === 0 ? 'Validate your key to load jobs.' : 'Used when “Add & trigger interview” is on.'}</div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
