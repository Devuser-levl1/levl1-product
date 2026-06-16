'use client'
import { useState } from 'react'

export interface RubricItem { skill: string; weight: number; required: boolean }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 }

// Screening Rubric editor — the recruiter defines the weighted skills/criteria
// AI scores candidates against. Pre-fills from the P0-1 JD fields; saving
// re-scores the whole pool so every view updates together.
export function RubricEditor({
  jobId, initial, mustHaveSkills, niceToHaveSkills, onSaved,
}: {
  jobId: string
  initial: RubricItem[]
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  onSaved: () => void
}) {
  const [rows, setRows] = useState<RubricItem[]>(initial.length ? initial : [])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (i: number, patch: Partial<RubricItem>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const add = () => setRows((rs) => [...rs, { skill: '', weight: 3, required: false }])
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i))

  function prefillFromJD() {
    const have = new Set(rows.map((r) => r.skill.trim().toLowerCase()))
    const next = [...rows]
    for (const s of mustHaveSkills) {
      if (s && !have.has(s.trim().toLowerCase())) { next.push({ skill: s, weight: 4, required: true }); have.add(s.trim().toLowerCase()) }
    }
    for (const s of niceToHaveSkills) {
      if (s && !have.has(s.trim().toLowerCase())) { next.push({ skill: s, weight: 2, required: false }); have.add(s.trim().toLowerCase()) }
    }
    setRows(next)
    setMsg(next.length === rows.length ? 'Rubric already covers the JD skills.' : 'Pre-filled from the JD — adjust weights, then save.')
  }

  async function saveAndRescore() {
    const clean = rows.map((r) => ({ skill: r.skill.trim(), weight: r.weight, required: r.required })).filter((r) => r.skill)
    setSaving(true); setMsg('')
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rubric: clean }) })
      if (!res.ok) { setMsg('Save failed.'); return }
      // Rubric changed → re-score the whole pool against it so the Candidates
      // list, Top Matches and popup all update together.
      setMsg('Saved — re-scoring candidates against the rubric…')
      await fetch(`/api/hire/jobs/${jobId}/match-candidates?refresh=true`, { method: 'POST' }).catch(() => {})
      setMsg('Saved & candidates re-scored against the rubric.')
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Screening Rubric</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.1)', borderRadius: 100, padding: '2px 8px' }}>drives AI scoring</span>
      </div>
      <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 14px' }}>
        Define what actually matters for this role. AI scores every candidate against these weighted skills — higher weight counts more, and missing a must-have caps the score.
      </p>

      {rows.length === 0 && (
        <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>No rubric yet — pre-fill from the JD or add skills below. Until you do, scoring uses the raw job description.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={r.skill}
              onChange={(e) => set(i, { skill: e.target.value })}
              placeholder="Skill or criterion (e.g. ASP.NET Core)"
              style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
            />
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
              Weight
              <select value={r.weight} onChange={(e) => set(i, { weight: Number(e.target.value) })} style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}>
                {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 11.5, color: r.required ? '#6D28D9' : '#64748B', fontWeight: r.required ? 700 : 500, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input type="checkbox" checked={r.required} onChange={(e) => set(i, { required: e.target.checked })} />
              Must-have
            </label>
            <button onClick={() => remove(i)} title="Remove" style={{ border: 'none', background: 'none', color: '#94A3B8', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button onClick={add} style={{ padding: '8px 12px', borderRadius: 8, border: '1px dashed #CBD5E1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add skill</button>
        {(mustHaveSkills.length > 0 || niceToHaveSkills.length > 0) && (
          <button onClick={prefillFromJD} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#6D28D9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>✨ Pre-fill from JD</button>
        )}
        <button onClick={saveAndRescore} disabled={saving} style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 8, border: 'none', background: saving ? '#A78BFA' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer' }}>
          {saving ? 'Saving…' : 'Save & re-score'}
        </button>
      </div>
      {msg && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 10 }}>{msg}</div>}
    </div>
  )
}
