'use client'
import { useEffect, useMemo, useState } from 'react'
import { DEAL_STAGES, STAGE_PROBABILITY } from '@/lib/hire/constants'
import { dealBreakdown, hasEconomics } from '@/lib/hire/deal-economics'

export interface DealLike {
  id: string; title: string; clientId?: string; value: number; stage: string; probability: number; notes?: string | null
  positions?: number | null; billRate?: number | null; hoursPerWeek?: number | null
  durationValue?: number | null; durationUnit?: string | null; margin?: number | null
  jobs?: { id: string; title: string }[]
  client?: { id: string; name: string }
}
interface ClientLite { id: string; name: string }
interface JobLite { id: string; title: string }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }
const str = (v: number | null | undefined) => (v == null ? '' : String(v))

// Unified create/edit deal modal — fully editable at any stage, with auto-computed
// deal economics (live breakdown) and optional job links.
export function DealModal({ deal, clients, defaultClientId, onClose, onSaved }: {
  deal?: DealLike | null
  clients: ClientLite[]
  defaultClientId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const editing = !!deal
  const [jobs, setJobs] = useState<JobLite[]>([])
  const [f, setF] = useState({
    title: deal?.title ?? '',
    clientId: deal?.clientId ?? deal?.client?.id ?? defaultClientId ?? '',
    stage: deal?.stage ?? 'Discovery',
    probability: deal?.probability ?? STAGE_PROBABILITY['Discovery'] ?? 10,
    notes: deal?.notes ?? '',
    value: str(deal?.value),
    positions: str(deal?.positions),
    billRate: str(deal?.billRate),
    hoursPerWeek: str(deal?.hoursPerWeek),
    durationValue: str(deal?.durationValue),
    durationUnit: deal?.durationUnit ?? 'months',
    margin: str(deal?.margin),
  })
  const [jobIds, setJobIds] = useState<string[]>(deal?.jobs?.map((j) => j.id) ?? [])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => { fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setJobs(d.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title })))).catch(() => {}) }, [])

  const econ = useMemo(() => ({
    positions: f.positions === '' ? null : Number(f.positions),
    billRate: f.billRate === '' ? null : Number(f.billRate),
    hoursPerWeek: f.hoursPerWeek === '' ? null : Number(f.hoursPerWeek),
    durationValue: f.durationValue === '' ? null : Number(f.durationValue),
    durationUnit: f.durationUnit,
    margin: f.margin === '' ? null : Number(f.margin),
  }), [f.positions, f.billRate, f.hoursPerWeek, f.durationValue, f.durationUnit, f.margin])

  const usesEconomics = hasEconomics(econ)
  const bd = useMemo(() => dealBreakdown(econ), [econ])
  const finalValue = usesEconomics ? bd.value : (Number(f.value) || 0)

  async function save() {
    if (!f.title || !f.clientId) { setErr('Title and client are required'); return }
    setSaving(true); setErr('')
    const payload = {
      title: f.title, clientId: f.clientId, stage: f.stage, probability: f.probability, notes: f.notes,
      value: usesEconomics ? undefined : (Number(f.value) || 0),
      positions: econ.positions, billRate: econ.billRate, hoursPerWeek: econ.hoursPerWeek,
      durationValue: econ.durationValue, durationUnit: usesEconomics ? f.durationUnit : null, margin: econ.margin,
      jobIds,
    }
    const res = await fetch(editing ? `/api/hire/crm/deals/${deal!.id}` : '/api/hire/crm/deals', {
      method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) onSaved(); else setErr((await res.json().catch(() => ({}))).error ?? 'Failed to save')
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 560, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>{editing ? 'Edit deal' : 'New deal'}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>Title</label><input style={inp} placeholder="e.g. Java devs — Q3 staffing" value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>Client</label><select style={inp} value={f.clientId} onChange={(e) => set('clientId', e.target.value)}><option value="">Select client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={lbl}>Stage (editable anytime)</label><select style={inp} value={f.stage} onChange={(e) => setF((p) => ({ ...p, stage: e.target.value, probability: STAGE_PROBABILITY[e.target.value] ?? p.probability }))}>{DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>

          {/* Economics */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, background: '#FBFAFF' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#6D28D9', marginBottom: 10 }}>Deal economics <span style={{ fontWeight: 600, color: '#94A3B8' }}>· auto-calculates deal size</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Positions</label><input style={inp} type="number" min="0" placeholder="4" value={f.positions} onChange={(e) => set('positions', e.target.value)} /></div>
              <div><label style={lbl}>Bill rate /hr</label><input style={inp} type="number" min="0" placeholder="30" value={f.billRate} onChange={(e) => set('billRate', e.target.value)} /></div>
              <div><label style={lbl}>Hours / week</label><input style={inp} type="number" min="0" placeholder="40" value={f.hoursPerWeek} onChange={(e) => set('hoursPerWeek', e.target.value)} /></div>
              <div><label style={lbl}>Duration</label><input style={inp} type="number" min="0" placeholder="6" value={f.durationValue} onChange={(e) => set('durationValue', e.target.value)} /></div>
              <div><label style={lbl}>Unit</label><select style={inp} value={f.durationUnit} onChange={(e) => set('durationUnit', e.target.value)}><option value="months">months</option><option value="weeks">weeks</option></select></div>
              <div><label style={lbl}>Margin % (opt)</label><input style={inp} type="number" min="0" placeholder="—" value={f.margin} onChange={(e) => set('margin', e.target.value)} /></div>
            </div>

            {usesEconomics ? (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff', border: '1px solid #EDE9FE', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                  {Number(f.positions) || 0} positions × {inr(Number(f.billRate) || 0)}/hr × {Number(f.hoursPerWeek) || 0} hrs/wk × {bd.weeks} weeks{f.durationUnit === 'months' && f.durationValue ? ` (${f.durationValue} months)` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#6D28D9' }}>{inr(bd.value)}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>deal size</span>
                  {bd.marginAmount != null && <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>· margin {inr(bd.marginAmount)} ({f.margin}%)</span>}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <label style={lbl}>Deal value (₹) — or fill economics above to auto-calculate</label>
                <input style={inp} type="number" placeholder="0" value={f.value} onChange={(e) => set('value', e.target.value)} />
              </div>
            )}
          </div>

          {/* Job links */}
          <div>
            <label style={lbl}>Linked jobs (optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {jobs.length === 0 && <span style={{ fontSize: 12.5, color: '#94A3B8' }}>No jobs yet.</span>}
              {jobs.map((j) => {
                const on = jobIds.includes(j.id)
                return (
                  <button key={j.id} onClick={() => setJobIds((p) => on ? p.filter((x) => x !== j.id) : [...p, j.id])}
                    style={{ padding: '5px 11px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? '#6D28D9' : '#E2E8F0'}`, background: on ? 'rgba(109,40,217,0.08)' : '#fff', color: on ? '#6D28D9' : '#475569' }}>
                    {on ? '✓ ' : ''}{j.title}
                  </button>
                )
              })}
            </div>
          </div>

          <div><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 60 }} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>

          {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#475569' }}>Deal size: <strong style={{ color: '#0F172A' }}>{inr(finalValue)}</strong></div>
            <button onClick={onClose} disabled={saving} style={{ marginLeft: 'auto', padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create deal'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
