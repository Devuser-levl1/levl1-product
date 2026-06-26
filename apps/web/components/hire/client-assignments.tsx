'use client'
import { useCallback, useEffect, useState } from 'react'
import { ROLE_LABEL } from '@/lib/hire/roles'

interface Lite { id: string; name: string; email: string }
interface Member extends Lite { role: string }
interface ClientRow { id: string; name: string; recruiters: Lite[] }

// Manager/Admin tool: assign one or more recruiters to each client. A recruiter
// then sees only their assigned clients' jobs, candidates and deals.
export function ClientAssignments() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/hire/team/client-assignments').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d) { setClients(d.clients ?? []); setMembers(d.members ?? []) }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])
  useEffect(() => { load() }, [load])

  function open(c: ClientRow) {
    setEditing(c.id)
    setSel(new Set(c.recruiters.map((r) => r.id)))
  }
  function toggle(id: string) {
    setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  async function save(clientId: string) {
    setSaving(true)
    await fetch('/api/hire/team/client-assignments', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, recruiterIds: Array.from(sel) }),
    }).catch(() => {})
    setSaving(false); setEditing(null); load()
  }

  if (!loaded) return <div style={{ color: '#475569' }}>Loading…</div>
  if (clients.length === 0) return <div style={{ color: '#475569', fontSize: 14 }}>No clients yet. Add clients in the CRM first.</div>

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #F1F5F9', fontSize: 12.5, color: '#64748B' }}>
        Assign recruiters to clients. Recruiters see only their assigned clients&apos; jobs, candidates and deals.
      </div>
      {clients.map((c, idx) => (
        <div key={c.id} style={{ padding: '14px 18px', borderBottom: idx < clients.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>
                {c.recruiters.length === 0 ? 'No recruiters assigned' : c.recruiters.map((r) => r.name).join(', ')}
              </div>
            </div>
            {editing !== c.id && <button onClick={() => open(c)} style={ghost}>Edit</button>}
          </div>

          {editing === c.id && (
            <div style={{ marginTop: 12, background: '#F8FAFC', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {members.map((m) => {
                  const on = sel.has(m.id)
                  return (
                    <button key={m.id} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, padding: '7px 11px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (on ? '#6D28D9' : '#E2E8F0'), background: on ? 'rgba(109,40,217,0.08)' : '#fff', color: on ? '#6D28D9' : '#475569' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid ' + (on ? '#6D28D9' : '#CBD5E1'), background: on ? '#6D28D9' : '#fff', color: '#fff', fontSize: 10, lineHeight: '13px', textAlign: 'center' }}>{on ? '✓' : ''}</span>
                      {m.name} <span style={{ color: '#94A3B8', fontWeight: 500 }}>· {ROLE_LABEL[m.role] ?? m.role}</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => save(c.id)} disabled={saving} style={{ ...ghost, background: '#6D28D9', color: '#fff', border: 'none', fontWeight: 700 }}>{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(null)} style={ghost}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const ghost: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }
