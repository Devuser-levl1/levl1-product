'use client'
import { useEffect, useState, useCallback } from 'react'
import { VIZ } from '@/components/hire/viz'

interface Activity { id: string; type: string; note: string | null; fromStage: string | null; toStage: string | null; actorName: string | null; createdAt: string }
interface Lead {
  id: string; company: string; contactName: string | null; email: string | null; phone: string | null
  source: string | null; type: string | null; stage: string; estValue: number | null; notes: string | null
  ownerName: string | null; convertedTenantId: string | null; wonAt: string | null; lostReason: string | null
  lastContactedAt: string | null; createdAt: string; updatedAt: string; activities?: Activity[]
}
interface Grouped { stage: string; leads: Lead[]; totalValue: number }

const STAGES = ['New', 'Contacted', 'Demo', 'Proposal', 'Won', 'Lost']
const SOURCES = ['Inbound', 'Outbound', 'Referral', 'LinkedIn', 'Event', 'Other']
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: `1px solid ${VIZ.line}`, fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: VIZ.slate, display: 'block', marginBottom: 4 }
const stageColor = (s: string) => s === 'Won' ? VIZ.good : s === 'Lost' ? VIZ.bad : s === 'Proposal' ? VIZ.primary : VIZ.slate

export default function PlatformClientsPage() {
  const [grouped, setGrouped] = useState<Grouped[]>([])
  const [openValue, setOpenValue] = useState(0)
  const [wonValue, setWonValue] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [edit, setEdit] = useState<Lead | null>(null)

  const load = useCallback(() => {
    fetch('/api/platform/leads').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setGrouped(d.grouped ?? []); setOpenValue(d.openValue ?? 0); setWonValue(d.wonValue ?? 0) } }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const total = grouped.reduce((s, g) => s + g.leads.length, 0)

  return (
    <div style={{ maxWidth: 1240 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: VIZ.ink, margin: 0 }}>Clients</h1>
        <button onClick={() => setShowNew(true)} style={{ marginLeft: 'auto', padding: '9px 15px', borderRadius: 9, border: 'none', background: VIZ.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New lead</button>
      </div>
      <div style={{ fontSize: 14, color: VIZ.slate, marginBottom: 16 }}>Your client-acquisition pipeline — onboard new clients into Levl1.</div>

      <div style={{ display: 'flex', gap: 22, marginBottom: 18, padding: '12px 16px', background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 12 }}>
        <div style={{ fontSize: 13, color: VIZ.slate }}>Pipeline: <strong style={{ color: VIZ.primary }}>{inr(openValue)}</strong></div>
        <div style={{ fontSize: 13, color: VIZ.slate }}>Won: <strong style={{ color: VIZ.good }}>{inr(wonValue)}</strong></div>
        <div style={{ fontSize: 13, color: VIZ.slate }}>Leads: <strong>{total}</strong></div>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {STAGES.map((stage) => {
          const g = grouped.find((x) => x.stage === stage)
          const leads = g?.leads ?? []
          return (
            <div key={stage} style={{ width: 230, flexShrink: 0, background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageColor(stage) }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: 0.4 }}>{stage}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: VIZ.faint, background: VIZ.track, borderRadius: 100, padding: '1px 8px' }}>{leads.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leads.map((l) => (
                  <div key={l.id} onClick={() => setEdit(l)} style={{ border: `1px solid ${VIZ.track}`, borderRadius: 10, padding: '10px 11px', cursor: 'pointer' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: VIZ.ink }}>{l.company}</div>
                    {l.contactName && <div style={{ fontSize: 11.5, color: VIZ.faint }}>{l.contactName}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {l.estValue != null && <span style={{ fontSize: 11, fontWeight: 700, color: VIZ.primary }}>{inr(l.estValue)}</span>}
                      {l.convertedTenantId && <span style={{ fontSize: 10, fontWeight: 700, color: VIZ.good }}>✓ provisioned</span>}
                      {l.source && <span style={{ fontSize: 10, color: VIZ.faint }}>{l.source}</span>}
                    </div>
                  </div>
                ))}
                {leads.length === 0 && <div style={{ fontSize: 12, color: VIZ.faint, textAlign: 'center', padding: '14px 0' }}>—</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
      {edit && <LeadModal lead={edit} onClose={() => setEdit(null)} onChanged={() => load()} onClosed={() => setEdit(null)} />}
    </div>
  )
}

function NewLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ company: '', contactName: '', email: '', phone: '', source: 'Inbound', type: 'AGENCY', estValue: '', notes: '' })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.company.trim()) { setErr('Company is required'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/platform/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, estValue: f.estValue ? Number(f.estValue) : null }) })
    setSaving(false); if (res.ok) onSaved(); else setErr((await res.json().catch(() => ({}))).error ?? 'Failed')
  }
  return (
    <Overlay onClose={onClose} width={460}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>New lead</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><label style={lbl}>Company *</label><input style={inp} value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}><label style={lbl}>Contact</label><input style={inp} value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></div><div style={{ flex: 1 }}><label style={lbl}>Email</label><input style={inp} value={f.email} onChange={(e) => set('email', e.target.value)} /></div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Source</label><select style={inp} value={f.source} onChange={(e) => set('source', e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div style={{ flex: 1 }}><label style={lbl}>Type</label><select style={inp} value={f.type} onChange={(e) => set('type', e.target.value)}><option value="AGENCY">Agency</option><option value="CORPORATE">Corporate</option></select></div>
          <div style={{ flex: 1 }}><label style={lbl}>Est. value</label><input style={inp} type="number" value={f.estValue} onChange={(e) => set('estValue', e.target.value)} /></div>
        </div>
        <div><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 56 }} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        {err && <div style={{ color: VIZ.bad, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${VIZ.line}`, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: VIZ.primary, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Create lead'}</button>
        </div>
      </div>
    </Overlay>
  )
}

function LeadModal({ lead, onClose, onChanged, onClosed }: { lead: Lead; onClose: () => void; onChanged: () => void; onClosed: () => void }) {
  const [l, setL] = useState<Lead>(lead)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [provision, setProvision] = useState(false)
  const set = (k: keyof Lead, v: unknown) => setL((p) => ({ ...p, [k]: v }))

  const reloadDetail = useCallback(() => { fetch(`/api/platform/leads/${lead.id}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setL(d) }).catch(() => {}) }, [lead.id])
  useEffect(() => { reloadDetail() }, [reloadDetail])

  async function patch(extra: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/platform/leads/${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(extra) })
    setSaving(false)
    if (res.ok) { reloadDetail(); onChanged() }
  }
  async function saveFields() { await patch({ company: l.company, contactName: l.contactName, email: l.email, phone: l.phone, source: l.source, type: l.type, estValue: l.estValue, notes: l.notes }) }
  async function changeStage(stage: string) { setL((p) => ({ ...p, stage })); await patch({ stage }) }
  async function addNote() { if (!note.trim()) return; await patch({ note: note.trim(), contacted: true }); setNote('') }
  async function del() { if (!confirm(`Delete lead ${l.company}?`)) return; await fetch(`/api/platform/leads/${lead.id}`, { method: 'DELETE' }); onChanged(); onClosed() }

  return (
    <Overlay onClose={onClose} width={620}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{l.company}</div>
        {l.convertedTenantId && <span style={{ fontSize: 11, fontWeight: 700, color: VIZ.good, background: 'rgba(5,150,105,0.10)', borderRadius: 100, padding: '3px 10px' }}>✓ Provisioned</span>}
        <button onClick={del} style={{ marginLeft: 'auto', fontSize: 12.5, color: VIZ.bad, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
      </div>

      {/* Stage selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {STAGES.map((s) => <button key={s} onClick={() => changeStage(s)} style={{ padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${l.stage === s ? stageColor(s) : VIZ.line}`, background: l.stage === s ? `${stageColor(s)}14` : '#fff', color: l.stage === s ? stageColor(s) : VIZ.slate }}>{s}</button>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={lbl}>Contact</label><input style={inp} value={l.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} /></div>
        <div><label style={lbl}>Email</label><input style={inp} value={l.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
        <div><label style={lbl}>Phone</label><input style={inp} value={l.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
        <div><label style={lbl}>Est. value</label><input style={inp} type="number" value={l.estValue ?? ''} onChange={(e) => set('estValue', e.target.value === '' ? null : Number(e.target.value))} /></div>
        <div><label style={lbl}>Source</label><select style={inp} value={l.source ?? 'Other'} onChange={(e) => set('source', e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label style={lbl}>Type</label><select style={inp} value={l.type ?? 'AGENCY'} onChange={(e) => set('type', e.target.value)}><option value="AGENCY">Agency</option><option value="CORPORATE">Corporate</option></select></div>
      </div>
      <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 54 }} value={l.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <button onClick={saveFields} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: VIZ.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
        {l.convertedTenantId
          ? <a href="/platform/usage" style={{ marginLeft: 'auto', fontSize: 12.5, color: VIZ.good, fontWeight: 700, textDecoration: 'none' }}>View in usage ledger →</a>
          : <button onClick={() => setProvision(true)} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: `1px solid ${VIZ.good}`, background: 'rgba(5,150,105,0.08)', color: VIZ.good, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Provision tenant →</button>}
      </div>

      {/* Add note */}
      <div style={{ marginTop: 16, borderTop: `1px solid ${VIZ.track}`, paddingTop: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote() }} placeholder="Log a note / interaction…" style={{ ...inp, flex: 1 }} />
          <button onClick={addNote} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${VIZ.line}`, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Add</button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
          {(l.activities ?? []).map((a) => (
            <div key={a.id} style={{ fontSize: 12.5, color: VIZ.slate, display: 'flex', gap: 8 }}>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span style={{ flex: 1 }}>{a.note ?? a.type}{a.actorName ? <span style={{ color: VIZ.faint }}> — {a.actorName}</span> : null}</span>
              <span style={{ color: VIZ.faint, fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
          {(l.activities ?? []).length === 0 && <div style={{ fontSize: 12.5, color: VIZ.faint }}>No activity yet.</div>}
        </div>
      </div>

      {provision && <ProvisionModal lead={l} onClose={() => setProvision(false)} onDone={() => { setProvision(false); reloadDetail(); onChanged() }} />}
    </Overlay>
  )
}

function ProvisionModal({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ tenantName: lead.company, adminName: lead.contactName ?? '', adminEmail: lead.email ?? '', type: lead.type ?? 'AGENCY' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function go() {
    if (!f.tenantName.trim() || !f.adminName.trim() || !f.adminEmail.trim()) { setErr('All fields are required'); return }
    setBusy(true); setErr('')
    const res = await fetch(`/api/platform/leads/${lead.id}/provision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    setBusy(false)
    if (res.ok) { setDone(true); setTimeout(onDone, 1200) } else setErr((await res.json().catch(() => ({}))).error ?? 'Failed to provision')
  }
  return (
    <Overlay onClose={onClose} width={440} z={90}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Provision Levl1 tenant</div>
      <div style={{ fontSize: 13, color: VIZ.slate, marginBottom: 14, lineHeight: 1.5 }}>Creates a real Hire workspace and emails the admin a set-up link (14-day trial).</div>
      {done ? <div style={{ fontSize: 14, fontWeight: 700, color: VIZ.good, padding: '16px 0' }}>✓ Provisioned — invite sent to {f.adminEmail}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label style={lbl}>Workspace name</label><input style={inp} value={f.tenantName} onChange={(e) => set('tenantName', e.target.value)} /></div>
          <div><label style={lbl}>Admin name</label><input style={inp} value={f.adminName} onChange={(e) => set('adminName', e.target.value)} /></div>
          <div><label style={lbl}>Admin email</label><input style={inp} value={f.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} /></div>
          <div><label style={lbl}>Type</label><select style={inp} value={f.type} onChange={(e) => set('type', e.target.value)}><option value="AGENCY">Agency</option><option value="CORPORATE">Corporate</option></select></div>
          {err && <div style={{ color: VIZ.bad, fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${VIZ.line}`, background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={go} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: VIZ.good, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Provisioning…' : 'Provision & invite'}</button>
          </div>
        </div>
      )}
    </Overlay>
  )
}

function Overlay({ children, onClose, width = 460, z = 80 }: { children: React.ReactNode; onClose: () => void; width?: number; z?: number }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: z, padding: 16 }}><div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }}>{children}</div></div>
}
