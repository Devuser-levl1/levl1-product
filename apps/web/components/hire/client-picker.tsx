'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

interface ClientLite { id: string; name: string }

// Searchable CRM-client selector with an inline "add new client" shortcut.
// Tenant-scoped via the API. value = clientId ('' = no client).
export function ClientPicker({ value, onChange }: { value: string; onChange: (id: string, name?: string) => void }) {
  const [clients, setClients] = useState<ClientLite[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const load = () => fetch('/api/hire/crm/clients').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setClients(d.map((c: ClientLite) => ({ id: c.id, name: c.name })))).catch(() => {})
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  const selected = clients.find((c) => c.id === value)
  const filtered = useMemo(() => { const t = q.trim().toLowerCase(); return t ? clients.filter((c) => c.name.toLowerCase().includes(t)) : clients }, [clients, q])

  async function createClient() {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    const res = await fetch('/api/hire/crm/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setBusy(false)
    if (res.ok) { const c = await res.json(); await load(); onChange(c.id, c.name); setCreating(false); setNewName(''); setOpen(false) }
  }

  const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ ...inp, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <span style={{ color: selected ? '#0F172A' : '#94A3B8', flex: 1 }}>{selected ? selected.name : 'No client'}</span>
        <span style={{ color: '#94A3B8' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 12px 30px -8px rgba(15,23,42,0.18)', zIndex: 50, padding: 6, maxHeight: 280, overflowY: 'auto' }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" style={{ ...inp, marginBottom: 6 }} />
          <button type="button" onClick={() => { onChange('', undefined); setOpen(false) }} style={rowBtn(value === '')}>No client</button>
          {filtered.map((c) => <button key={c.id} type="button" onClick={() => { onChange(c.id, c.name); setOpen(false) }} style={rowBtn(c.id === value)}>{c.name}</button>)}
          {filtered.length === 0 && !creating && <div style={{ fontSize: 12.5, color: '#94A3B8', padding: '8px 10px' }}>No matches.</div>}
          <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 6, paddingTop: 6 }}>
            {!creating ? (
              <button type="button" onClick={() => { setCreating(true); setNewName(q) }} style={{ ...rowBtn(false), color: '#6D28D9', fontWeight: 700 }}>+ Add new client</button>
            ) : (
              <div style={{ display: 'flex', gap: 6, padding: '2px' }}>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createClient() } }} placeholder="New client name" style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={createClient} disabled={busy || !newName.trim()} style={{ padding: '0 12px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{busy ? '…' : 'Add'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function rowBtn(active: boolean): React.CSSProperties {
  return { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, background: active ? 'rgba(109,40,217,0.08)' : 'transparent', color: active ? '#6D28D9' : '#334155', fontWeight: active ? 700 : 500 }
}
