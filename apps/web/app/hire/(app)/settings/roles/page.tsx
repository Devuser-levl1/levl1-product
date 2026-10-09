'use client'
import { useEffect, useState, useCallback } from 'react'

interface CapMeta { key: string; label: string; description: string }
interface Data { roles: string[]; capabilities: CapMeta[]; matrix: Record<string, string[]>; adminLocked: string[] }

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Manager', RECRUITER: 'Recruiter', VIEWER: 'Viewer' }

export default function RolesPermissionsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(() => {
    fetch('/api/hire/settings/role-permissions').then((r) => {
      if (r.status === 403) { setForbidden(true); return null }
      return r.ok ? r.json() : null
    }).then((d: Data | null) => {
      if (!d) return
      setData(d)
      const m: Record<string, Set<string>> = {}
      for (const role of d.roles) m[role] = new Set(d.matrix[role] ?? [])
      setMatrix(m)
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const locked = (role: string, cap: string) => role === 'ADMIN' && (data?.adminLocked ?? []).includes(cap)
  const toggle = (role: string, cap: string) => {
    if (locked(role, cap)) return
    setNote('')
    setMatrix((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) }
      next[role].has(cap) ? next[role].delete(cap) : next[role].add(cap)
      return next
    })
  }

  async function save() {
    if (!data) return
    setSaving(true); setNote('')
    const payload: Record<string, string[]> = {}
    for (const role of data.roles) payload[role] = Array.from(matrix[role] ?? [])
    const res = await fetch('/api/hire/settings/role-permissions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matrix: payload }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setNote(d.error ?? 'Could not save'); return }
    // Re-sync from the server's resolved matrix (Admin lock-on caps re-applied).
    const m: Record<string, Set<string>> = {}
    for (const role of data.roles) m[role] = new Set((d.matrix?.[role]) ?? [])
    setMatrix(m)
    setNote('Saved — changes take effect immediately across the app.')
  }

  if (forbidden) return (
    <div style={{ maxWidth: 520, padding: '32px 0' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Admins only</div>
      <div style={{ fontSize: 13.5, color: '#64748B', marginTop: 6 }}>Roles &amp; Permissions can only be managed by an admin.</div>
    </div>
  )
  if (!data) return <div style={{ color: '#475569' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Roles &amp; Permissions</h1>
      <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 8px' }}>Control what each role can see and do. Changes apply immediately across the app — navigation and every backend check.</p>
      <div style={{ fontSize: 12, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', marginBottom: 18 }}>
        Admin always keeps <strong>Settings admin</strong>, <strong>Team management</strong> and <strong>Billing</strong> (locked) so you can&apos;t lock yourself out. On Enterprise accounts, CRM / Receivables / Nurture stay hidden regardless of this matrix.
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Capability</th>
              {data.roles.map((r) => <th key={r} style={{ padding: '12px 10px', fontSize: 12, fontWeight: 800, color: '#0F172A', textAlign: 'center', width: 110 }}>{ROLE_LABEL[r] ?? r}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.capabilities.map((cap) => (
              <tr key={cap.key} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{cap.label}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{cap.description}</div>
                </td>
                {data.roles.map((role) => {
                  const on = matrix[role]?.has(cap.key) ?? false
                  const isLocked = locked(role, cap.key)
                  return (
                    <td key={role} style={{ textAlign: 'center', padding: '11px 10px' }}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={isLocked}
                        onChange={() => toggle(role, cap.key)}
                        title={isLocked ? 'Locked on for Admin — cannot be removed' : `${ROLE_LABEL[role] ?? role}: ${cap.label}`}
                        style={{ width: 16, height: 16, cursor: isLocked ? 'not-allowed' : 'pointer', accentColor: '#6D28D9', opacity: isLocked ? 0.55 : 1 }}
                      />
                      {isLocked && <div style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 2 }}>locked</div>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button onClick={save} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
        {note && <span style={{ fontSize: 13, fontWeight: 600, color: note.startsWith('Saved') ? '#059669' : '#DC2626' }}>{note}</span>}
      </div>
    </div>
  )
}
