'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StagesEditor } from '@/components/hire/stages-editor'

const DEFAULT_STAGES = ['Sourced', 'Screening', 'Interview', 'Technical Round', 'HR Round', 'Offer', 'Hired']
const inp: React.CSSProperties = { padding: '11px 13px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }

export default function NewJobPage() {
  const router = useRouter()
  const [form, setForm] = useState({ title: '', department: '', location: 'Bengaluru', description: '', salaryMin: '', salaryMax: '' })
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    if (!form.title.trim() || !form.description.trim()) { setError('Title and description are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/hire/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, department: form.department || null, location: form.location || null,
          description: form.description,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          stages,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Could not create job'); setSaving(false); return }
      router.push(`/hire/jobs/${d.id}`)
    } catch { setError('Something went wrong'); setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 20px' }}>Create New Job</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 }}>
        <div>
          <label style={label}>Job Title</label>
          <input style={inp} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Technology Manager — BI" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={label}>Department</label><input style={inp} value={form.department} onChange={(e) => set('department', e.target.value)} /></div>
          <div><label style={label}>Location</label>
            <select style={inp} value={form.location} onChange={(e) => set('location', e.target.value)}>
              <option>Bengaluru</option><option>Remote</option><option>Hybrid</option><option>Mumbai</option><option>Delhi NCR</option><option>Hyderabad</option><option>Pune</option>
            </select>
          </div>
        </div>
        <div>
          <label style={label}>Job Description</label>
          <textarea style={{ ...inp, minHeight: 160, resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Paste the JD here…" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={label}>Min Salary (₹/year)</label><input style={inp} type="number" value={form.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder="1800000" /></div>
          <div><label style={label}>Max Salary (₹/year)</label><input style={inp} type="number" value={form.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder="2800000" /></div>
        </div>
        <div>
          <label style={label}>Pipeline Stages</label>
          <StagesEditor stages={stages} onChange={setStages} />
        </div>
        {error && <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving} style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Publish Job'}</button>
          <button onClick={() => router.push('/hire/jobs')} style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
