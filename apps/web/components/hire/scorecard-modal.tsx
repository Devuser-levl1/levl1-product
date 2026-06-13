'use client'
import { useState } from 'react'

const OVERALL = [['strong_yes', 'Strong Yes'], ['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']] as const

export function ScorecardModal({ interviewId, onClose, onSaved }: { interviewId: string; onClose: () => void; onSaved: (overall: string) => void }) {
  const [overall, setOverall] = useState('yes')
  const [technical, setTechnical] = useState(3)
  const [communication, setCommunication] = useState(3)
  const [cultureFit, setCultureFit] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/hire/interviews/${interviewId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', scorecard: { overall, technical, communication, cultureFit, notes } }),
    })
    setSaving(false)
    if (res.ok) onSaved(overall)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 400 }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Scorecard</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Overall</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {OVERALL.map(([v, l]) => <button key={v} onClick={() => setOverall(v)} style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (overall === v ? '#4F46E5' : '#E2E8F0'), background: overall === v ? 'rgba(79,70,229,0.08)' : '#fff', color: overall === v ? '#4F46E5' : '#64748B', cursor: 'pointer' }}>{l}</button>)}
            </div>
          </div>
          <Stars label="Technical" value={technical} onChange={setTechnical} />
          <Stars label="Communication" value={communication} onChange={setCommunication} />
          <Stars label="Culture fit" value={cultureFit} onChange={setCultureFit} />
          <textarea style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, minHeight: 70 }} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Scorecard'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
function Stars({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, color: '#475569', width: 110 }}>{label}</span>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} onClick={() => onChange(n)} style={{ cursor: 'pointer', fontSize: 18, color: n <= value ? '#F59E0B' : '#E2E8F0' }}>★</span>)}
    </div>
  )
}
