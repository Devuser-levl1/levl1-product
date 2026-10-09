import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getSettings } from './storage'
import { scrapeProfile } from './scrape'
import { captureToHire, AuthError } from './api'
import { Captured, Settings } from './types'

const PURPLE = '#6D28D9'
const I: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }
const L: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }

const empty: Captured = { name: '', title: '', company: '', location: '', profileUrl: '', email: '', phone: '', source: 'generic' }
const SOURCE_LABEL: Record<string, string> = { linkedin: 'LinkedIn profile', indeed: 'Indeed profile', naukri: 'Naukri profile', generic: 'Page' }

async function captureActiveTab(): Promise<Captured> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return empty
  // Prefer the declared content script (LinkedIn/Indeed/Naukri); fall back to
  // on-demand inject for anything else.
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'LEVL1_SCRAPE' })
    if (resp?.ok && resp.data) return resp.data as Captured
  } catch { /* no content script on this page — inject below */ }
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrapeProfile })
    if (res?.result) return res.result as Captured
  } catch { /* restricted page (chrome://, store, etc.) */ }
  return { ...empty, profileUrl: tab.url ?? '' }
}

function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [fields, setFields] = useState<Captured>(empty)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ candidateUrl: string; duplicate: boolean } | null>(null)

  useEffect(() => {
    (async () => {
      const s = await getSettings()
      setSettings(s)
      if (s.apiKey) setFields(await captureActiveTab())
      setLoading(false)
    })()
  }, [])

  const set = (k: keyof Captured, v: string) => setFields((f) => ({ ...f, [k]: v }))

  async function submit() {
    if (!settings) return
    if (!fields.name.trim()) { setError('A name is required.'); return }
    setError(''); setSubmitting(true)
    try {
      // Capture into Levl1 Hire: deduped per job, scored, source-tagged, added
      // to the pipeline. Attaches to the default Hire job when one is set.
      const candidate = await captureToHire(settings, {
        name: fields.name.trim(),
        email: fields.email.trim() || undefined,
        phone: fields.phone.trim() || undefined,
        title: fields.title.trim() || undefined,
        company: fields.company.trim() || undefined,
        location: fields.location.trim() || undefined,
        profileUrl: fields.profileUrl || undefined,
        source: fields.source,
        jobId: settings.defaultJobId || undefined,
      })
      setDone({ candidateUrl: candidate.candidateUrl || `${settings.baseUrl}/hire/candidates`, duplicate: candidate.duplicate })
    } catch (e) {
      if (e instanceof AuthError) setError('Your API key is invalid or revoked. Re-enter it in Options.')
      else setError(e instanceof Error ? e.message : 'Failed to add candidate.')
    } finally { setSubmitting(false) }
  }

  const Header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${PURPLE}, #2563EB)`, transform: 'rotate(45deg)' }} />
      <div style={{ fontWeight: 800, fontSize: 14 }}>Levl1 Capture</div>
      <button onClick={() => chrome.runtime.openOptionsPage()} title="Options" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 13 }}>⚙︎</button>
    </div>
  )

  if (loading) return <div>{Header}<div style={{ padding: 18, fontSize: 13, color: '#94A3B8' }}>Reading page…</div></div>

  if (!settings?.apiKey) return (
    <div>{Header}
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>Add your Levl1 Hire API key to start capturing candidates.</div>
        <button onClick={() => chrome.runtime.openOptionsPage()} style={{ ...I, background: PURPLE, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 12 }}>Open setup</button>
      </div>
    </div>
  )

  if (done) return (
    <div>{Header}
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', marginBottom: 8 }}>{done.duplicate ? '✓ Already on this job' : '✓ Added to Levl1 Hire'}</div>
        {done.duplicate && <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 8 }}>This candidate was already on the selected job — no duplicate created.</div>}
        <a href={done.candidateUrl} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 13, color: PURPLE, marginBottom: 8 }}>View in candidates →</a>
        <button onClick={() => { setDone(null); setFields(empty) }} style={{ ...I, marginTop: 6, cursor: 'pointer' }}>Capture another</button>
      </div>
    </div>
  )

  if (fields.capturable === false) return (
    <div>{Header}
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 12, lineHeight: 1.5 }}>
          {fields.notice ?? 'Open a specific candidate’s profile first, then click capture.'}
        </div>
        <button onClick={async () => { setLoading(true); setFields(await captureActiveTab()); setLoading(false) }} style={{ ...I, marginTop: 12, cursor: 'pointer' }}>Re-check this page</button>
      </div>
    </div>
  )

  return (
    <div>{Header}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Source: {SOURCE_LABEL[fields.source] ?? 'Page'} · edit before adding</div>
        <div><span style={L}>Name *</span><input style={I} value={fields.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><span style={L}>Email</span><input style={I} value={fields.email} onChange={(e) => set('email', e.target.value)} placeholder="add if not shown" /></div>
          <div style={{ flex: 1 }}><span style={L}>Phone</span><input style={I} value={fields.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        </div>
        <div><span style={L}>Title</span><input style={I} value={fields.title} onChange={(e) => set('title', e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><span style={L}>Company</span><input style={I} value={fields.company} onChange={(e) => set('company', e.target.value)} /></div>
          <div style={{ flex: 1 }}><span style={L}>Location</span><input style={I} value={fields.location} onChange={(e) => set('location', e.target.value)} /></div>
        </div>

        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
          {settings.defaultJobId ? 'Adds to your default Hire job (set in Options) — scored & deduped.' : 'Adds to your talent pool (no default job set in Options).'}
        </div>
        {error && <div style={{ fontSize: 12.5, color: '#DC2626' }}>{error}</div>}
        <button onClick={submit} disabled={submitting} style={{ ...I, background: PURPLE, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 6 }}>
          {submitting ? 'Adding…' : 'Add to Levl1'}
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
