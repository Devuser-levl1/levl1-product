'use client'
import { useEffect, useState, useCallback } from 'react'

interface Row {
  id: string; createdAt: string; actorName: string | null; actorUserId: string | null
  action: string; actionLabel: string; targetType: string | null; targetName: string | null
  fromStage: string | null; toStage: string | null; reason: string | null
}
interface Member { id: string; name: string; email: string }

const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }

export default function AuditLogPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [user, setUser] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      setRole(d?.user?.role ?? null); setReady(true)
    }).catch(() => setReady(true))
    fetch('/api/hire/team').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setMembers(d)).catch(() => {})
  }, [])

  const qs = useCallback(() => {
    const p = new URLSearchParams()
    if (user) p.set('user', user)
    if (action) p.set('action', action)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [user, action, from, to])

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/hire/audit?${qs()}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d) { setRows(d.rows ?? []); setLabels(d.actionLabels ?? {}) }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [qs])

  useEffect(() => { if (role === 'ADMIN') load() }, [role, load])

  if (!ready) return <div style={{ color: '#475569' }}>Loading…</div>
  if (role !== 'ADMIN') return (
    <div style={{ maxWidth: 520, padding: '32px 0' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Access restricted</div>
      <div style={{ fontSize: 13.5, color: '#64748B', marginTop: 6 }}>The audit log is available to tenant admins only. Ask an admin if you need access.</div>
      <a href="/hire/settings" style={{ display: 'inline-block', marginTop: 16, color: '#6D28D9', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>← Back to settings</a>
    </div>
  )

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Audit Log</h1>
        <span style={{ fontSize: 13, color: '#64748B' }}>Every significant action across your workspace — admin only.</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '16px 0' }}>
        <select style={inp} value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="">All users</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
        </select>
        <select style={inp} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label style={{ fontSize: 12, color: '#64748B' }}>From <input type="date" style={inp} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label style={{ fontSize: 12, color: '#64748B' }}>To <input type="date" style={inp} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load} style={{ ...inp, cursor: 'pointer', background: '#6D28D9', color: '#fff', fontWeight: 700, border: 'none' }}>Apply</button>
        {(user || action || from || to) && <button onClick={() => { setUser(''); setAction(''); setFrom(''); setTo('') }} style={{ ...inp, cursor: 'pointer', color: '#64748B' }}>Clear</button>}
        <a href={`/api/hire/audit?${qs()}${qs() ? '&' : ''}format=csv`} style={{ ...inp, marginLeft: 'auto', cursor: 'pointer', textDecoration: 'none', color: '#6D28D9', fontWeight: 700 }}>⬇ Export CSV</a>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left' }}>
              {['When', 'Actor', 'Action', 'Target', 'Details'].map((h) => <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{fmt(r.createdAt)}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>{r.actorName ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 9px' }}>{r.actionLabel}</span></td>
                <td style={{ padding: '10px 12px', color: '#334155' }}>{r.targetName ?? '—'}{r.targetType ? <span style={{ color: '#94A3B8' }}> · {r.targetType}</span> : null}</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>
                  {r.fromStage && r.toStage ? <span>{r.fromStage} → {r.toStage}</span> : null}
                  {r.reason ? <span style={{ display: 'block', color: '#64748B', fontStyle: 'italic' }}>{r.reason}</span> : null}
                  {!r.fromStage && !r.reason ? '—' : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No audit entries match these filters.</td></tr>
            )}
            {loading && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>Showing the {rows.length} most recent matching entries (max 500). Export CSV for the full filtered set.</div>
    </div>
  )
}
