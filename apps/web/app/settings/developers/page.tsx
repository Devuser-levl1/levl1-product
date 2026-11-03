'use client'
import { useEffect, useState, useCallback } from 'react'
import { useConfirm, Alert } from '@/components/screen/ui'

// Interviews-side developer settings — API keys + webhooks for external ATS
// integrations, operating on the Interviews-owned models (Phase 1).

const EVENTS = ['interview.completed', 'report.ready'] as const
interface Key { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null }
interface Endpoint { id: string; url: string; secret: string; events: string[]; active: boolean }

const card: React.CSSProperties = { background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 14, padding: 22, marginBottom: 20 }

export default function InterviewsDevelopers() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--lv-text)', margin: '0 0 4px' }}>Developers / API</h1>
      <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: '0 0 24px' }}>Integrate Levl1 Interviews into your ATS: authenticate the public API (<code>/api/v1</code>) with a key, and receive results via signed webhooks.</p>
      <Keys />
      <Webhooks />
    </div>
  )
}

function Keys() {
  const [keys, setKeys] = useState<Key[]>([])
  const [name, setName] = useState('')
  const [raw, setRaw] = useState<string | null>(null)
  // Pass 5: distinguish loading / failed-to-load from "no keys".
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [confirm, confirmDialog] = useConfirm()
  const load = useCallback(() => { fetch('/api/interviews/api-keys').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d) => { if (Array.isArray(d)) setKeys(d); setLoadState('ok') }).catch(() => setLoadState('error')) }, [])
  useEffect(() => { load() }, [load])
  async function create() {
    const res = await fetch('/api/interviews/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const d = await res.json(); if (res.ok) { setRaw(d.key); setName(''); load() }
  }
  async function revoke(id: string) { if (!(await confirm({ title: 'Revoke this key?', description: 'Integrations using it stop working immediately. This cannot be undone.', confirmLabel: 'Revoke key', destructive: true }))) return; await fetch(`/api/interviews/api-keys/${id}`, { method: 'DELETE' }); load() }
  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--lv-text)', marginBottom: 12 }}>API keys</div>
      {raw && (
        <div style={{ background: 'var(--lv-success-soft)', border: '1px solid var(--lv-success-border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lv-success)', marginBottom: 6 }}>Copy your key now — shown only once.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={{ flex: 1, background: 'var(--lv-surface)', border: '1px solid var(--lv-success-border)', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto', whiteSpace: 'nowrap' }}>{raw}</code>
            <button className="lv-btn lv-btn--primary lv-btn--sm" onClick={() => navigator.clipboard.writeText(raw)}>Copy</button>
            <button className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => setRaw(null)}>Done</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="lv-input" style={{ flex: 1 }} aria-label="API key label" placeholder="Key label (e.g. Bullhorn prod)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="lv-btn lv-btn--primary lv-btn--sm" onClick={create}>+ Generate API key</button>
      </div>
      {confirmDialog}
      {loadState === 'loading' ? <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--lv-text-muted)' }}><span className="lv-spinner" aria-hidden="true" style={{ color: 'var(--lv-brand)' }} /> Loading…</div> : loadState === 'error' ? <Alert tone="danger" title="Couldn't load API keys" action={<button type="button" className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => { setLoadState('loading'); load() }}>Retry</button>}>Check your connection and try again.</Alert> : keys.length === 0 ? <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>No API keys yet — generate one above to authenticate the public API.</div> : keys.map((k) => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--lv-surface-muted)', borderRadius: 10, marginBottom: 8, opacity: k.revokedAt ? 0.55 : 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--lv-text)' }}>{k.name} <code style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{k.prefix}…</code></div>
            <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}>{k.revokedAt ? 'Revoked' : k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString('en-IN')}` : 'Never used'}</div>
          </div>
          {!k.revokedAt && <button className="lv-btn lv-btn--secondary lv-btn--sm" style={{ color: 'var(--lv-danger)' }} onClick={() => revoke(k.id)}>Revoke</button>}
        </div>
      ))}
    </div>
  )
}

function Webhooks() {
  const [eps, setEps] = useState<Endpoint[]>([])
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([...EVENTS])
  const [err, setErr] = useState('')
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [confirm, confirmDialog] = useConfirm()
  const load = useCallback(() => { fetch('/api/interviews/webhooks').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d) => { if (Array.isArray(d)) setEps(d); setLoadState('ok') }).catch(() => setLoadState('error')) }, [])
  useEffect(() => { load() }, [load])
  async function add() {
    setErr(''); const res = await fetch('/api/interviews/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, events }) })
    const d = await res.json(); if (res.ok) { setUrl(''); load() } else setErr(d.error ?? 'Failed')
  }
  async function toggle(ep: Endpoint) { await fetch(`/api/interviews/webhooks/${ep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !ep.active }) }); load() }
  async function remove(id: string) { if (!(await confirm({ title: 'Delete this endpoint?', description: 'Levl1 stops sending events to it. This cannot be undone.', confirmLabel: 'Delete endpoint', destructive: true }))) return; await fetch(`/api/interviews/webhooks/${id}`, { method: 'DELETE' }); load() }
  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--lv-text)', marginBottom: 4 }}>Webhook endpoints</div>
      <div style={{ fontSize: 12.5, color: 'var(--lv-text-body)', marginBottom: 14 }}>Signed with <code>X-Levl1-Signature: sha256=&lt;hmac&gt;</code> using the endpoint secret.</div>
      <div style={{ border: '1px dashed var(--lv-border-strong)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <input className="lv-input" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10 }} aria-label="Webhook endpoint URL" placeholder="https://your-ats.example.com/levl1/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          {EVENTS.map((ev) => <label key={ev} style={{ fontSize: 13, color: 'var(--lv-text-body)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents((p) => e.target.checked ? [...p, ev] : p.filter((x) => x !== ev))} /><code>{ev}</code></label>)}
        </div>
        {err && <div style={{ color: 'var(--lv-danger)', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <button className="lv-btn lv-btn--primary lv-btn--sm" onClick={add} disabled={!url}>+ Add endpoint</button>
      </div>
      {confirmDialog}
      {loadState === 'loading' ? <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--lv-text-muted)' }}><span className="lv-spinner" aria-hidden="true" style={{ color: 'var(--lv-brand)' }} /> Loading…</div> : loadState === 'error' ? <Alert tone="danger" title="Couldn't load webhook endpoints" action={<button type="button" className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => { setLoadState('loading'); load() }}>Retry</button>}>Check your connection and try again.</Alert> : eps.length === 0 ? <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>No endpoints yet — add one above to receive interview results.</div> : eps.map((ep) => (
        <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--lv-surface-muted)', borderRadius: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--lv-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</div>
            <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}>{ep.events.join(', ')}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: ep.active ? 'color-mix(in srgb, var(--lv-success) 10%, transparent)' : 'var(--lv-surface-muted)', color: ep.active ? 'var(--lv-success)' : 'var(--lv-text-body)' }}>{ep.active ? 'Active' : 'Paused'}</span>
          <button className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => toggle(ep)}>{ep.active ? 'Pause' : 'Resume'}</button>
          <button className="lv-btn lv-btn--secondary lv-btn--sm" style={{ color: 'var(--lv-danger)' }} onClick={() => remove(ep.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
