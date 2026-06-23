'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { INDUSTRIES, DEAL_STAGES, STAGE_PROBABILITY } from '@/lib/hire/constants'
import { DealModal, type DealLike } from '@/components/hire/deal-modal'

interface Client { id: string; name: string; industry: string | null; website: string | null; contacts: unknown[]; jobs: { id: string; title: string }[]; deals: { id: string; value: number; stage: string }[]; _count: { contacts: number; deals: number; jobs: number } }
interface Deal extends DealLike { client: { id: string; name: string } }
interface Grouped { stage: string; deals: Deal[]; totalValue: number }

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }

export default function CrmPage() {
  const [tab, setTab] = useState<'clients' | 'deals'>('clients')
  const [clients, setClients] = useState<Client[]>([])
  const [grouped, setGrouped] = useState<Grouped[]>([])
  const [showClient, setShowClient] = useState(false)
  const [showDeal, setShowDeal] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)

  const loadClients = useCallback(() => { fetch('/api/hire/crm/clients').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setClients(d)).catch(() => {}) }, [])
  const loadDeals = useCallback(() => { fetch('/api/hire/crm/deals').then((r) => (r.ok ? r.json() : null)).then((d) => d?.grouped && setGrouped(d.grouped)).catch(() => {}) }, [])
  useEffect(() => { loadClients(); loadDeals() }, [loadClients, loadDeals])

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>CRM</h1>
        <div style={{ marginLeft: 'auto' }}>
          {tab === 'clients'
            ? <button onClick={() => setShowClient(true)} style={primary}>+ Add Client</button>
            : <button onClick={() => setShowDeal(true)} style={primary}>+ New Deal</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 18 }}>
        {(['clients', 'deals'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t ? '#6D28D9' : 'transparent'), color: tab === t ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>
            {t === 'clients' ? `Clients (${clients.length})` : 'Deals'}
          </button>
        ))}
      </div>

      {tab === 'clients' ? <ClientsTab clients={clients} reload={loadClients} /> : <DealsTab grouped={grouped} reload={loadDeals} onEdit={setEditDeal} />}

      {showClient && <AddClientModal onClose={() => setShowClient(false)} onSaved={() => { setShowClient(false); loadClients() }} />}
      {showDeal && <DealModal clients={clients} onClose={() => setShowDeal(false)} onSaved={() => { setShowDeal(false); loadDeals() }} />}
      {editDeal && <DealModal deal={editDeal} clients={clients} onClose={() => setEditDeal(null)} onSaved={() => { setEditDeal(null); loadDeals() }} />}
    </div>
  )
}

const primary: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }

function ClientsTab({ clients, reload }: { clients: Client[]; reload: () => void }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const shown = clients.filter((c) => (!search || c.name.toLowerCase().includes(search.toLowerCase())) && (!industry || c.industry === industry))

  async function del(c: Client) {
    if (!confirm(`Delete ${c.name}?`)) return
    const res = await fetch(`/api/hire/crm/clients/${c.id}`, { method: 'DELETE' })
    if (!res.ok) alert((await res.json()).error ?? 'Could not delete')
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" style={{ ...inp, flex: 1 }} />
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={inp}><option value="">All industries</option>{INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}</select>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14 }}>
        {shown.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No clients yet.</div>}
        {shown.map((c, i) => {
          const pipeline = c.deals.reduce((s, d) => s + d.value, 0)
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: i < shown.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{c.industry ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{c._count.contacts} contacts · {c.jobs.length} active jobs · {c.deals.length} open deals{pipeline > 0 ? ` · Pipeline ${inr(pipeline)}` : ''}</div>
              </div>
              <button onClick={() => router.push(`/hire/crm/clients/${c.id}`)} style={{ ...inp, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>View</button>
              <button onClick={() => router.push(`/hire/jobs/new?clientId=${c.id}`)} style={{ ...inp, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>+ Add Job</button>
              <button onClick={() => del(c)} style={{ ...inp, color: '#DC2626', cursor: 'pointer' }}>Delete</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DealsTab({ grouped, reload, onEdit }: { grouped: Grouped[]; reload: () => void; onEdit: (d: Deal) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const openTotal = grouped.filter((g) => g.stage !== 'Closed Won' && g.stage !== 'Closed Lost').reduce((s, g) => s + g.totalValue, 0)
  const wonTotal = grouped.find((g) => g.stage === 'Closed Won')?.totalValue ?? 0

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const toStage = String(over.id)
    const deal = grouped.flatMap((g) => g.deals).find((d) => d.id === active.id)
    if (!deal || deal.stage === toStage) return
    await fetch(`/api/hire/crm/deals/${deal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: toStage, probability: STAGE_PROBABILITY[toStage] }) })
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '10px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10 }}>
        <div style={{ fontSize: 13, color: '#475569' }}>Open Pipeline: <strong style={{ color: '#6D28D9' }}>{inr(openTotal)}</strong></div>
        <div style={{ fontSize: 13, color: '#475569' }}>Won: <strong style={{ color: '#10B981' }}>{inr(wonTotal)}</strong></div>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {grouped.map((g) => <DealColumn key={g.stage} group={g} onEdit={onEdit} />)}
        </div>
      </DndContext>
    </div>
  )
}

function DealColumn({ group, onEdit }: { group: Grouped; onEdit: (d: Deal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.stage })
  return (
    <div ref={setNodeRef} style={{ width: 220, flexShrink: 0, background: isOver ? '#F1F5F9' : '#F8FAFC', border: isOver ? '1px dashed #6D28D9' : '1px solid #E2E8F0', borderRadius: 10, padding: '12px 10px', minHeight: 200 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{group.stage}</div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>{inr(group.totalValue)}</div>
      {group.deals.map((d) => <DealCard key={d.id} deal={d} onEdit={onEdit} />)}
      {group.deals.length === 0 && <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center', paddingTop: 20 }}>—</div>}
    </div>
  )
}

function DealCard({ deal, onEdit }: { deal: Deal; onEdit: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={() => onEdit(deal)} title="Click to edit"
      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', marginBottom: 8, cursor: 'grab', opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{deal.client.name}</div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{deal.title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9' }}>{inr(deal.value)}</span>
        <span style={{ fontSize: 11, color: '#475569' }}>{deal.probability}%</span>
      </div>
      {deal.jobs && deal.jobs.length > 0 && (
        <div style={{ fontSize: 10.5, color: '#7C3AED', marginTop: 5 }}>🔗 {deal.jobs.length} linked job{deal.jobs.length > 1 ? 's' : ''}</div>
      )}
    </div>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}><div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 420, maxHeight: '90vh', overflowY: 'auto' }}>{children}</div></div>
}

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', industry: '', website: '', contactName: '', contactEmail: '', contactRole: '' })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.name) { setErr('Company name required'); return }
    setSaving(true)
    const res = await fetch('/api/hire/crm/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    setSaving(false); if (res.ok) onSaved(); else setErr((await res.json()).error ?? 'Failed')
  }
  return <Overlay onClose={onClose}>
    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Add Client</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input style={inp} placeholder="Company name" value={f.name} onChange={(e) => set('name', e.target.value)} />
      <select style={inp} value={f.industry} onChange={(e) => set('industry', e.target.value)}><option value="">Select industry</option>{INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}</select>
      <input style={inp} placeholder="Website" value={f.website} onChange={(e) => set('website', e.target.value)} />
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 6 }}>Primary contact (optional)</div>
      <input style={inp} placeholder="Contact name" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} />
      <input style={inp} placeholder="Contact email" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
      <input style={inp} placeholder="Contact role" value={f.contactRole} onChange={(e) => set('contactRole', e.target.value)} />
      {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Client'}</button>
      </div>
    </div>
  </Overlay>
}

