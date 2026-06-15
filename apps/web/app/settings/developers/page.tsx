'use client'
import { useEffect, useState, useCallback } from 'react'

// Interviews-side developer settings — API keys + webhooks for external ATS
// integrations, operating on the Interviews-owned models (Phase 1).

const EVENTS = ['interview.completed', 'report.ready'] as const
interface Key { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null }
interface Endpoint { id: string; url: string; secret: string; events: string[]; active: boolean }

const ACCENT = '#4F46E5'
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22, marginBottom: 20 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
const btn: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { ...inp, fontWeight: 600, color: '#475569', cursor: 'pointer' }

export default function InterviewsDevelopers() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Developers / API</h1>
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 24px' }}>Integrate Levl1 Interviews into your ATS: authenticate the public API (<code>/api/v1</code>) with a key, and receive results via signed webhooks.</p>
      <Keys />
      <Webhooks />
    </div>
  )
}

function Keys() {
  const [keys, setKeys] = useState<Key[]>([])
  const [name, setName] = useState('')
  const [raw, setRaw] = useState<string | null>(null)
  const load = useCallback(() => { fetch('/api/interviews/api-keys').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setKeys(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  async function create() {
    const res = await fetch('/api/interviews/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const d = await res.json(); if (res.ok) { setRaw(d.key); setName(''); load() }
  }
  async function revoke(id: string) { if (!confirm('Revoke this key?')) return; await fetch(`/api/interviews/api-keys/${id}`, { method: 'DELETE' }); load() }
  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>API keys</div>
      {raw && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>Copy your key now — shown only once.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={{ flex: 1, background: '#fff', border: '1px solid #A7F3D0', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto', whiteSpace: 'nowrap' }}>{raw}</code>
            <button style={btn} onClick={() => navigator.clipboard.writeText(raw)}>Copy</button>
            <button style={ghost} onClick={() => setRaw(null)}>Done</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input style={{ ...inp, flex: 1 }} placeholder="Key label (e.g. Bullhorn prod)" value={name} onChange={(e) => setName(e.target.value)} />
        <button style={btn} onClick={create}>+ Generate API key</button>
      </div>
      {keys.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No API keys yet.</div> : keys.map((k) => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 10, marginBottom: 8, opacity: k.revokedAt ? 0.55 : 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{k.name} <code style={{ fontSize: 12, color: '#64748B' }}>{k.prefix}…</code></div>
            <div style={{ fontSize: 12, color: '#475569' }}>{k.revokedAt ? 'Revoked' : k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString('en-IN')}` : 'Never used'}</div>
          </div>
          {!k.revokedAt && <button style={{ ...ghost, color: '#DC2626' }} onClick={() => revoke(k.id)}>Revoke</button>}
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
  const load = useCallback(() => { fetch('/api/interviews/webhooks').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setEps(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  async function add() {
    setErr(''); const res = await fetch('/api/interviews/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, events }) })
    const d = await res.json(); if (res.ok) { setUrl(''); load() } else setErr(d.error ?? 'Failed')
  }
  async function toggle(ep: Endpoint) { await fetch(`/api/interviews/webhooks/${ep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !ep.active }) }); load() }
  async function remove(id: string) { if (!confirm('Delete endpoint?')) return; await fetch(`/api/interviews/webhooks/${id}`, { method: 'DELETE' }); load() }
  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Webhook endpoints</div>
      <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>Signed with <code>X-Levl1-Signature: sha256=&lt;hmac&gt;</code> using the endpoint secret.</div>
      <div style={{ border: '1px dashed #CBD5E1', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} placeholder="https://your-ats.example.com/levl1/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          {EVENTS.map((ev) => <label key={ev} style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents((p) => e.target.checked ? [...p, ev] : p.filter((x) => x !== ev))} /><code>{ev}</code></label>)}
        </div>
        {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <button style={btn} onClick={add} disabled={!url}>+ Add endpoint</button>
      </div>
      {eps.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No endpoints yet.</div> : eps.map((ep) => (
        <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{ep.events.join(', ')}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: ep.active ? 'rgba(5,150,105,0.1)' : '#F1F5F9', color: ep.active ? '#059669' : '#475569' }}>{ep.active ? 'Active' : 'Paused'}</span>
          <button style={ghost} onClick={() => toggle(ep)}>{ep.active ? 'Pause' : 'Resume'}</button>
          <button style={{ ...ghost, color: '#DC2626' }} onClick={() => remove(ep.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
