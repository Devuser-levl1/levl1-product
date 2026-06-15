'use client'
import { useEffect, useState, useCallback } from 'react'

const EVENTS = ['interview.completed', 'report.ready'] as const

interface ApiKey { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }
interface Endpoint { id: string; url: string; secret: string; events: string[]; active: boolean; createdAt: string }
interface Delivery { id: string; event: string; status: string; attempts: number; lastError: string | null; createdAt: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22, marginBottom: 20 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
const btn: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { ...inp, fontWeight: 600, color: '#475569', cursor: 'pointer' }

export default function DevelopersPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Developers / API</h1>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 22px' }}>Authenticate the public API (<code>/api/v1</code>) with an API key, and receive interview results via signed webhooks.</p>
      <ApiKeys />
      <McpCard />
      <Webhooks />
    </div>
  )
}

function McpCard() {
  const [copied, setCopied] = useState('')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://levl1.io'
  const url = `${origin}/api/mcp`
  const config = `{
  "mcpServers": {
    "levl1-hire": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${url}",
        "--header", "Authorization: Bearer YOUR_API_KEY"]
    }
  }
}`
  const copy = (text: string, what: string) => { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500) }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Connect to AI (MCP)</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.1)', borderRadius: 100, padding: '2px 8px' }}>New</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>Chat with your live Hire data from Claude Desktop, ChatGPT or any MCP client — &ldquo;which candidates for the Backend role scored above 80?&rdquo;. Read-only and scoped to your API key&apos;s account.</div>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>MCP server URL</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <code style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', fontSize: 12.5 }}>{url}</code>
        <button style={btn} onClick={() => copy(url, 'url')}>{copied === 'url' ? 'Copied' : 'Copy'}</button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Claude Desktop config (claude_desktop_config.json)</div>
      <pre style={{ background: '#0F172A', color: '#E2E8F0', borderRadius: 8, padding: 14, fontSize: 11.5, overflowX: 'auto', margin: 0 }}>{config}</pre>
      <button style={{ ...ghost, marginTop: 8 }} onClick={() => copy(config, 'cfg')}>{copied === 'cfg' ? 'Copied' : 'Copy config'}</button>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 10 }}>Replace <code>YOUR_API_KEY</code> with a key above. Tools: list_jobs, search_candidates, get_candidate, get_interview_report, pipeline_summary, recent_activity. Read-only — the AI can view but never change your data.</div>
    </div>
  )
}

function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => { fetch('/api/hire/api-keys').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setKeys(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    setCreating(true)
    const res = await fetch('/api/hire/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const d = await res.json()
    setCreating(false)
    if (res.ok) { setRawKey(d.key); setName(''); load() }
  }
  async function revoke(id: string) {
    if (!confirm('Revoke this key? Calls using it will immediately stop working.')) return
    await fetch(`/api/hire/api-keys/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>API keys</div>
      <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 16 }}>Pass as <code>Authorization: Bearer &lt;key&gt;</code> or <code>x-api-key</code>. The raw key is shown only once.</div>

      {rawKey && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>Copy your new key now — you won&apos;t see it again.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <code style={{ flex: 1, background: '#fff', border: '1px solid #A7F3D0', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto', whiteSpace: 'nowrap' }}>{rawKey}</code>
            <button style={btn} onClick={() => { navigator.clipboard.writeText(rawKey); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? 'Copied' : 'Copy'}</button>
            <button style={ghost} onClick={() => setRawKey(null)}>Done</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input style={{ ...inp, flex: 1 }} placeholder="Key label (e.g. Bullhorn prod)" value={name} onChange={(e) => setName(e.target.value)} />
        <button style={btn} onClick={create} disabled={creating}>{creating ? 'Generating…' : '+ Generate API key'}</button>
      </div>

      {keys.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No API keys yet.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keys.map((k) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 10, opacity: k.revokedAt ? 0.55 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{k.name} <code style={{ fontSize: 12, color: '#64748B' }}>{k.prefix}…</code></div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{k.revokedAt ? 'Revoked' : k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString('en-IN')}` : 'Never used'}</div>
              </div>
              {!k.revokedAt && <button style={{ ...ghost, color: '#DC2626' }} onClick={() => revoke(k.id)}>Revoke</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Webhooks() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([...EVENTS])
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => { fetch('/api/hire/webhooks').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setEndpoints(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  async function add() {
    setErr(''); setAdding(true)
    const res = await fetch('/api/hire/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, events }) })
    const d = await res.json()
    setAdding(false)
    if (res.ok) { setUrl(''); setEvents([...EVENTS]); load() } else setErr(d.error ?? 'Failed')
  }
  async function toggle(ep: Endpoint) {
    await fetch(`/api/hire/webhooks/${ep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !ep.active }) })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return
    await fetch(`/api/hire/webhooks/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Webhook endpoints</div>
      <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 16 }}>We POST signed JSON with header <code>X-Levl1-Signature: sha256=&lt;hmac&gt;</code> (HMAC of the raw body using the endpoint secret).</div>

      <div style={{ border: '1px dashed #64748B', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} placeholder="https://your-ats.example.com/levl1/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          {EVENTS.map((ev) => (
            <label key={ev} style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents((p) => e.target.checked ? [...p, ev] : p.filter((x) => x !== ev))} />
              <code>{ev}</code>
            </label>
          ))}
        </div>
        {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <button style={btn} onClick={add} disabled={adding || !url}>{adding ? 'Adding…' : '+ Add endpoint'}</button>
      </div>

      {endpoints.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No webhook endpoints yet.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {endpoints.map((ep) => <EndpointRow key={ep.id} ep={ep} onToggle={() => toggle(ep)} onRemove={() => remove(ep.id)} />)}
        </div>
      )}
    </div>
  )
}

function EndpointRow({ ep, onToggle, onRemove }: { ep: Endpoint; onToggle: () => void; onRemove: () => void }) {
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  async function loadDeliveries() {
    if (deliveries) { setDeliveries(null); return }
    const d = await fetch(`/api/hire/webhooks/${ep.id}/deliveries`).then((r) => (r.ok ? r.json() : [])).catch(() => [])
    setDeliveries(Array.isArray(d) ? d : [])
  }
  async function retry(id: string) {
    await fetch(`/api/hire/webhooks/deliveries/${id}/retry`, { method: 'POST' })
    const d = await fetch(`/api/hire/webhooks/${ep.id}/deliveries`).then((r) => (r.ok ? r.json() : [])).catch(() => [])
    setDeliveries(Array.isArray(d) ? d : [])
  }

  const statusColor = (s: string) => s === 'success' ? '#059669' : s === 'failed' ? '#DC2626' : '#D97706'

  return (
    <div style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{ep.events.map((e) => <code key={e} style={{ marginRight: 8 }}>{e}</code>)}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: ep.active ? 'rgba(5,150,105,0.1)' : '#F1F5F9', color: ep.active ? '#059669' : '#475569' }}>{ep.active ? 'Active' : 'Paused'}</span>
        <button style={ghost} onClick={onToggle}>{ep.active ? 'Pause' : 'Resume'}</button>
        <button style={ghost} onClick={loadDeliveries}>{deliveries ? 'Hide' : 'Deliveries'}</button>
        <button style={{ ...ghost, color: '#DC2626' }} onClick={onRemove}>Delete</button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
        Secret: <code>{showSecret ? ep.secret : '••••••••••••'}</code>{' '}
        <button onClick={() => setShowSecret((s) => !s)} style={{ background: 'none', border: 'none', color: '#6D28D9', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{showSecret ? 'Hide' : 'Reveal'}</button>
      </div>

      {deliveries && (
        <div style={{ marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
          {deliveries.length === 0 ? <div style={{ fontSize: 12.5, color: '#475569' }}>No deliveries yet.</div> : deliveries.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '5px 0' }}>
              <span style={{ color: statusColor(d.status), fontWeight: 700, width: 64 }}>{d.status}</span>
              <code style={{ flex: 1 }}>{d.event}</code>
              <span style={{ color: '#475569' }}>{d.attempts} attempt{d.attempts !== 1 ? 's' : ''}</span>
              <span style={{ color: '#64748B' }}>{new Date(d.createdAt).toLocaleTimeString('en-IN')}</span>
              {d.status !== 'success' && <button onClick={() => retry(d.id)} style={{ background: 'none', border: 'none', color: '#6D28D9', cursor: 'pointer', fontWeight: 600 }}>Retry</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
