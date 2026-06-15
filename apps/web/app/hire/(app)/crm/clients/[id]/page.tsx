'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { STAGE_PROBABILITY, DEAL_STAGES } from '@/lib/hire/constants'

interface ContactActivity { id: string; type: string; note: string | null; createdAt: string }
interface Contact { id: string; name: string; email: string | null; phone: string | null; role: string | null; linkedinUrl: string | null; lastContactedAt: string | null; activities: ContactActivity[] }
interface Deal { id: string; title: string; value: number; stage: string; probability: number }
interface Job { id: string; title: string; status: string; _count: { candidates: number } }
interface Client { id: string; name: string; industry: string | null; website: string | null; contacts: Contact[]; deals: Deal[]; jobs: Job[] }

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
const TABS = ['Overview', 'Jobs', 'Deals', 'Activity'] as const

export default function ClientDetailPage() {
  const params = useParams(); const router = useRouter()
  const id = String(params?.id ?? '')
  const [client, setClient] = useState<Client | null>(null)
  const [tab, setTab] = useState<typeof TABS[number]>('Overview')
  const [addContact, setAddContact] = useState(false)
  const [logFor, setLogFor] = useState<Contact | null>(null)
  const [addDeal, setAddDeal] = useState(false)

  const load = useCallback(() => { fetch(`/api/hire/crm/clients/${id}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && !d.error) setClient(d) }).catch(() => {}) }, [id])
  useEffect(() => { load() }, [load])
  if (!client) return <div style={{ color: '#475569' }}>Loading…</div>

  const allActivity = client.contacts.flatMap((c) => c.activities.map((a) => ({ ...a, contactName: c.name }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div style={{ maxWidth: 820 }}>
      <button onClick={() => router.push('/hire/crm')} style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>← CRM</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{client.name}</h1>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>{[client.industry, client.website].filter(Boolean).join(' · ') || '—'}</div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 18 }}>
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t ? '#6D28D9' : 'transparent'), color: tab === t ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>{t}</button>)}
      </div>

      {tab === 'Overview' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Key Contacts ({client.contacts.length})</div>
            <button onClick={() => setAddContact(true)} style={{ marginLeft: 'auto', ...inp, fontWeight: 600, color: '#6D28D9', cursor: 'pointer' }}>+ Add Contact</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {client.contacts.length === 0 && <div style={card}>No contacts yet.</div>}
            {client.contacts.map((c) => (
              <div key={c.id} style={card}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{c.name}{c.role ? ` · ${c.role}` : ''}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{[c.email, c.phone].filter(Boolean).join(' · ') || '—'}</div>
                {c.linkedinUrl && <div style={{ fontSize: 12, marginTop: 2 }}><a href={c.linkedinUrl} style={{ color: '#6D28D9' }}>{c.linkedinUrl}</a></div>}
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Last contact: {c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'never'}</div>
                <div style={{ marginTop: 8 }}><button onClick={() => setLogFor(c)} style={{ ...inp, fontWeight: 600, color: '#6D28D9', cursor: 'pointer' }}>Log Contact</button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Jobs' && (
        <div>
          <button onClick={() => router.push(`/hire/jobs/new?clientId=${client.id}`)} style={{ ...inp, fontWeight: 600, color: '#6D28D9', cursor: 'pointer', marginBottom: 12 }}>+ New Job for this client</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {client.jobs.length === 0 && <div style={card}>No jobs linked to this client.</div>}
            {client.jobs.map((j) => (
              <div key={j.id} onClick={() => router.push(`/hire/jobs/${j.id}`)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: '#0F172A' }}>{j.title}</div><div style={{ fontSize: 12, color: '#475569' }}>{j._count.candidates} candidates</div></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{j.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Deals' && (
        <div>
          <button onClick={() => setAddDeal(true)} style={{ ...inp, fontWeight: 600, color: '#6D28D9', cursor: 'pointer', marginBottom: 12 }}>+ New Deal</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {client.deals.length === 0 && <div style={card}>No deals yet.</div>}
            {client.deals.map((d) => (
              <div key={d.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: '#0F172A' }}>{d.title}</div><div style={{ fontSize: 12, color: '#475569' }}>{d.stage} · {d.probability}%</div></div>
                <span style={{ fontWeight: 800, color: '#6D28D9' }}>{inr(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Activity' && (
        <div style={card}>
          {allActivity.length === 0 && <div style={{ color: '#475569', fontSize: 13 }}>No activity logged yet.</div>}
          {allActivity.map((a) => (
            <div key={a.id} style={{ fontSize: 13, color: '#475569', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ color: '#475569' }}>{new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — </span>
              <strong>{a.contactName}</strong> · {a.type}{a.note ? `: ${a.note}` : ''}
            </div>
          ))}
        </div>
      )}

      {addContact && <ContactModal clientId={client.id} onClose={() => setAddContact(false)} onSaved={() => { setAddContact(false); load() }} />}
      {logFor && <LogModal contact={logFor} onClose={() => setLogFor(null)} onSaved={() => { setLogFor(null); load() }} />}
      {addDeal && <DealModal clientId={client.id} onClose={() => setAddDeal(false)} onSaved={() => { setAddDeal(false); load() }} />}
    </div>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}><div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 400 }}>{children}</div></div>
}
const modalBtns = (onClose: () => void, save: () => void, saving: boolean, label: string) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
    <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
    <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? '…' : label}</button>
  </div>
)

function ContactModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: '', linkedinUrl: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() { if (!f.name) return; setSaving(true); const r = await fetch(`/api/hire/crm/clients/${clientId}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); setSaving(false); if (r.ok) onSaved() }
  return <Overlay onClose={onClose}><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Add Contact</div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {(['name', 'email', 'phone', 'role', 'linkedinUrl'] as const).map((k) => <input key={k} style={inp} placeholder={k} value={f[k]} onChange={(e) => set(k, e.target.value)} />)}
    {modalBtns(onClose, save, saving, 'Save')}
  </div></Overlay>
}

function LogModal({ contact, onClose, onSaved }: { contact: Contact; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState('call'); const [note, setNote] = useState(''); const [saving, setSaving] = useState(false)
  async function save() { setSaving(true); const r = await fetch(`/api/hire/crm/contacts/${contact.id}/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, note }) }); setSaving(false); if (r.ok) onSaved() }
  return <Overlay onClose={onClose}><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Log interaction with {contact.name}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', gap: 12 }}>{['call', 'email', 'meeting', 'note'].map((t) => <label key={t} style={{ fontSize: 13, color: '#475569', cursor: 'pointer' }}><input type="radio" checked={type === t} onChange={() => setType(t)} /> {t}</label>)}</div>
    <textarea style={{ ...inp, minHeight: 80 }} placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} />
    {modalBtns(onClose, save, saving, 'Save')}
  </div></Overlay>
}

function DealModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: '', value: '', stage: 'Discovery', probability: 10, notes: '' })
  const [saving, setSaving] = useState(false)
  async function save() { if (!f.title) return; setSaving(true); const r = await fetch('/api/hire/crm/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, clientId, value: Number(f.value) || 0 }) }); setSaving(false); if (r.ok) onSaved() }
  return <Overlay onClose={onClose}><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>New Deal</div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <input style={inp} placeholder="Deal title" value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} />
    <input style={inp} type="number" placeholder="Value (₹)" value={f.value} onChange={(e) => setF((p) => ({ ...p, value: e.target.value }))} />
    <select style={inp} value={f.stage} onChange={(e) => setF((p) => ({ ...p, stage: e.target.value, probability: STAGE_PROBABILITY[e.target.value] }))}>{DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
    <textarea style={{ ...inp, minHeight: 60 }} placeholder="Notes" value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} />
    {modalBtns(onClose, save, saving, 'Create')}
  </div></Overlay>
}
