'use client'
import { useEffect, useState, useCallback } from 'react'

interface CredField { key: string; label: string; placeholder?: string }
interface Catalog { provider: string; label: string; authType: string; capabilities: { canPost: boolean; canSearch: boolean }; credFields: CredField[] }
interface Conn { id: string; provider: string; authType: string; email: string | null; accountId: string | null; canPost: boolean; canSearch: boolean; status: string; lastError: string | null; lastUsedAt: string | null }
interface AdminRow { id: string; provider: string; userName: string; userEmail: string; status: string; accountId: string | null; email: string | null; lastUsedAt: string | null }

const EXTENSION_URL = 'https://chromewebstore.google.com/' // Levl1 sourcing extension (placeholder until published)
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<Catalog[]>([])
  const [conns, setConns] = useState<Conn[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [admin, setAdmin] = useState<AdminRow[]>([])
  const [connect, setConnect] = useState<Catalog | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/boards').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setCatalog(d.catalog ?? []); setConns(d.connections ?? []) } }).catch(() => {})
  }, [])
  const loadAdmin = useCallback(() => { fetch('/api/hire/boards/admin').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.connections) { setIsAdmin(true); setAdmin(d.connections) } }).catch(() => {}) }, [])
  useEffect(() => { load(); loadAdmin() }, [load, loadAdmin])

  const connFor = (p: string) => conns.find((c) => c.provider === p)
  async function disconnect(provider: string) { if (!confirm('Disconnect this board? Stored credentials are deleted.')) return; await fetch(`/api/hire/boards/${provider}`, { method: 'DELETE' }); load(); if (isAdmin) loadAdmin() }
  async function revoke(id: string) { if (!confirm('Revoke this team member’s connection?')) return; await fetch(`/api/hire/boards/admin?id=${id}`, { method: 'DELETE' }); loadAdmin(); load() }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Integrations · Job Boards</h1>
      <div style={{ fontSize: 13.5, color: '#475569', marginBottom: 6 }}>Connect your own job-board accounts. Postings use <strong>your</strong> board credits; searches use <strong>your</strong> subscription — Levl1 connects to your account and adds AI on top.</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Connecting only stores access — posting &amp; searching arrive in upcoming releases.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {catalog.map((b) => {
          const conn = connFor(b.provider)
          const status = b.authType === 'extension' ? 'extension' : (conn?.status ?? 'not_connected')
          return (
            <div key={b.provider} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{b.label}</span>
                    <StatusPill status={status} />
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
                    {[b.capabilities.canPost ? 'Posting' : null, b.capabilities.canSearch ? 'Sourcing' : null].filter(Boolean).join(' · ')}
                    {conn?.accountId ? ` · ${conn.accountId}` : conn?.email ? ` · ${conn.email}` : ''}
                    {b.authType === 'extension' ? ' · via Chrome extension' : ''}
                  </div>
                  {conn?.status === 'error' && conn.lastError && <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>{conn.lastError}</div>}
                </div>
                {b.authType === 'extension'
                  ? <a href={EXTENSION_URL} target="_blank" rel="noreferrer" style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #6D28D9', background: '#fff', color: '#6D28D9', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Get the extension →</a>
                  : conn?.status === 'connected'
                    ? <button onClick={() => disconnect(b.provider)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#DC2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Disconnect</button>
                    : <button onClick={() => setConnect(b)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Connect</button>}
              </div>
              {b.authType === 'extension' && (
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 10, background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>Sourcing works via the Levl1 Chrome extension on your own logged-in LinkedIn session — no credentials are stored here.</div>
              )}
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Team connections <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 7px' }}>ADMIN</span></div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>Who connected which board. You can revoke any connection.</div>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#F8FAFC', color: '#475569' }}>{['Member', 'Board', 'Account', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>)}</tr></thead>
              <tbody>
                {admin.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '9px 12px' }}><div style={{ fontWeight: 600, color: '#0F172A' }}>{r.userName}</div><div style={{ fontSize: 11, color: '#94A3B8' }}>{r.userEmail}</div></td>
                    <td style={{ padding: '9px 12px', textTransform: 'capitalize' }}>{r.provider}</td>
                    <td style={{ padding: '9px 12px', color: '#64748B' }}>{r.accountId ?? r.email ?? '—'}</td>
                    <td style={{ padding: '9px 12px' }}><StatusPill status={r.status} /></td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}><button onClick={() => revoke(r.id)} style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Revoke</button></td>
                  </tr>
                ))}
                {admin.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>No board connections yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {connect && <ConnectModal board={connect} onClose={() => setConnect(null)} onConnected={() => { setConnect(null); load(); if (isAdmin) loadAdmin() }} />}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; bg: string; t: string }> = {
    connected: { c: '#059669', bg: 'rgba(5,150,105,0.10)', t: 'Connected' },
    error: { c: '#DC2626', bg: 'rgba(220,38,38,0.10)', t: 'Error' },
    extension: { c: '#6D28D9', bg: 'rgba(109,40,217,0.08)', t: 'Via extension' },
    pending: { c: '#D97706', bg: 'rgba(217,119,6,0.12)', t: 'Pending' },
    not_connected: { c: '#64748B', bg: '#F1F5F9', t: 'Not connected' },
  }
  const s = map[status] ?? map.not_connected
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.c, background: s.bg, borderRadius: 100, padding: '2px 9px' }}>{s.t}</span>
}

function ConnectModal({ board, onClose, onConnected }: { board: Catalog; onClose: () => void; onConnected: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  async function go() {
    setBusy(true); setErr('')
    const res = await fetch('/api/hire/boards/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: board.provider, ...vals }) })
    setBusy(false)
    if (res.ok) onConnected(); else setErr((await res.json().catch(() => ({}))).error ?? 'Could not connect')
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, maxWidth: '100%' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Connect {board.label}</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Enter the credentials {board.label} issued for your account. Postings/searches will run on your own credits &amp; subscription.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {board.credFields.map((fld) => (
            <div key={fld.key}><label style={lbl}>{fld.label}</label><input style={inp} type={/key|token|secret|password/i.test(fld.key) ? 'password' : 'text'} autoComplete="new-password" placeholder={fld.placeholder} value={vals[fld.key] ?? ''} onChange={(e) => setVals((p) => ({ ...p, [fld.key]: e.target.value }))} /></div>
          ))}
          {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={go} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Testing…' : 'Connect & test'}</button>
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8' }}>🔒 Verified, then encrypted at rest (AES-256-GCM). Never stored in plain text, never shown again, never sent back to the browser.</div>
        </div>
      </div>
    </div>
  )
}
