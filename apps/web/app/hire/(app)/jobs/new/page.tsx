'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { StagesEditor } from '@/components/hire/stages-editor'
import { ClientPicker } from '@/components/hire/client-picker'
import { FILE_ACCEPT_ATTR } from '@/lib/shared/file-constants'

const DEFAULT_STAGES = ['Sourced', 'Screening', 'Interview', 'Technical Round', 'HR Round', 'Offer', 'Hired']
const SENIORITIES = ['', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Manager', 'Director']
const inp: React.CSSProperties = { padding: '11px 13px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }
const purple = '#6D28D9'

interface Brief {
  title: string; summary: string; responsibilities: string[]; mustHaveSkills: string[]
  niceToHaveSkills: string[]; experience: string; screeningCriteria: string[]; suggestedInterviewFocus: string[]
}

function composeDescription(b: Brief): string {
  const parts: string[] = []
  if (b.summary) parts.push(b.summary)
  if (b.responsibilities.length) parts.push('Responsibilities\n' + b.responsibilities.map((r) => `• ${r}`).join('\n'))
  if (b.experience) parts.push('Experience\n' + b.experience)
  if (b.niceToHaveSkills.length) parts.push('Nice to have\n' + b.niceToHaveSkills.map((s) => `• ${s}`).join('\n'))
  return parts.join('\n\n')
}

export default function NewJobPage() {
  const router = useRouter()
  const [form, setForm] = useState({ title: '', department: '', location: 'Bengaluru', description: '', salaryMin: '', salaryMax: '' })
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState('')
  const [jdMode, setJdMode] = useState<'paste' | 'upload'>('paste')
  const [jdParsing, setJdParsing] = useState(false)
  const [jdNote, setJdNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // ── AI job-brief generator state ──
  const [gen, setGen] = useState({ role: '', specialize: '', seniority: '', industry: '', notes: '' })
  const setG = (k: string, v: string) => setGen((g) => ({ ...g, [k]: v }))
  const [generating, setGenerating] = useState(false)
  const [genErr, setGenErr] = useState('')
  const [aiGenerated, setAiGenerated] = useState(false)
  // Structured fields (newline-edited; source of truth on save).
  const [mustHave, setMustHave] = useState('')
  const [niceToHave, setNiceToHave] = useState('')
  const [screening, setScreening] = useState('')
  const [focus, setFocus] = useState('')
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

  async function generateBrief() {
    if (!gen.role.trim()) { setGenErr('Enter a role to generate a brief'); return }
    setGenerating(true); setGenErr(''); setError('')
    try {
      const res = await fetch('/api/hire/jobs/generate-brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: gen.role, techStack: gen.specialize, seniority: gen.seniority, industry: gen.industry, notes: gen.notes, location: form.location }),
      })
      const d = await res.json()
      if (!res.ok) { setGenErr(d.error ?? 'Generation failed'); return }
      const b: Brief = d.brief
      setForm((f) => ({ ...f, title: b.title || f.title, description: composeDescription(b) }))
      setMustHave(b.mustHaveSkills.join('\n'))
      setNiceToHave(b.niceToHaveSkills.join('\n'))
      setScreening(b.screeningCriteria.join('\n'))
      setFocus(b.suggestedInterviewFocus.join('\n'))
      setAiGenerated(true)
    } catch {
      setGenErr('Something went wrong — please try again')
    } finally { setGenerating(false) }
  }

  async function handleJdFile(file: File) {
    setJdParsing(true); setError(''); setJdNote('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/hire/jobs/parse-jd', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Could not parse JD file'); return }
      setForm((f) => ({ ...f, description: d.text, title: f.title || d.parsed?.title || '' }))
      const skills: string[] = d.parsed?.requiredSkills ?? []
      if (skills.length && !mustHave) setMustHave(skills.join('\n'))
      setJdNote(`Loaded ${d.text.length.toLocaleString()} chars${skills.length ? ` · skills: ${skills.slice(0, 6).join(', ')}` : ''}`)
    } catch {
      setError('Something went wrong reading the file')
    } finally {
      setJdParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  useEffect(() => {
    const pre = new URLSearchParams(window.location.search).get('clientId')
    if (pre) setClientId(pre)
  }, [])

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
          clientId: clientId || null,
          stages,
          mustHaveSkills: lines(mustHave), niceToHaveSkills: lines(niceToHave),
          screeningCriteria: lines(screening), interviewFocus: lines(focus),
          aiGenerated,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Could not create job'); setSaving(false); return }
      router.push(`/hire/jobs/${d.id}`)
    } catch { setError('Something went wrong'); setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Create New Job</h1>

      {/* ── AI Generator panel (hero) ── */}
      <div style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)', borderRadius: 14, padding: 2, marginBottom: 18 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>✨ Generate job brief with AI</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: purple, background: 'rgba(109,40,217,0.1)', borderRadius: 100, padding: '2px 8px' }}>Levl1 AI</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>Type the role and nudge the specialization — get a deep, role-specific brief, not a generic template.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={label}>Role <span style={{ color: '#DC2626' }}>*</span></label>
              <input style={inp} value={gen.role} onChange={(e) => setG('role', e.target.value)} placeholder="e.g. Senior Backend Engineer" />
            </div>
            <div>
              <label style={{ ...label, color: purple }}>Specialize <span style={{ fontWeight: 500, color: '#94A3B8' }}>— the nudge that makes it specific</span></label>
              <input style={{ ...inp, border: `1.5px solid ${purple}`, background: 'rgba(109,40,217,0.03)' }} value={gen.specialize} onChange={(e) => setG('specialize', e.target.value)} placeholder="e.g. .NET / C# / Azure   ·   Java / Spring microservices   ·   React, fintech" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={label}>Seniority</label>
                <select style={inp} value={gen.seniority} onChange={(e) => setG('seniority', e.target.value)}>
                  {SENIORITIES.map((s) => <option key={s} value={s}>{s || 'Any'}</option>)}
                </select>
              </div>
              <div><label style={label}>Industry</label><input style={inp} value={gen.industry} onChange={(e) => setG('industry', e.target.value)} placeholder="e.g. Fintech" /></div>
            </div>
            <div><label style={label}>Anything else? <span style={{ fontWeight: 500, color: '#94A3B8' }}>(optional)</span></label>
              <input style={inp} value={gen.notes} onChange={(e) => setG('notes', e.target.value)} placeholder="e.g. must have led a small team; remote-first" /></div>
            {genErr && <div style={{ color: '#DC2626', fontSize: 13 }}>{genErr}</div>}
            <div>
              <button onClick={generateBrief} disabled={generating || !gen.role.trim()} style={{ padding: '11px 20px', borderRadius: 9, border: 'none', background: generating ? '#A78BFA' : purple, color: '#fff', fontWeight: 700, fontSize: 14, cursor: generating || !gen.role.trim() ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {generating ? <><Spinner /> Writing brief…</> : aiGenerated ? '✨ Regenerate' : '✨ Generate brief'}
              </button>
              {aiGenerated && !generating && <span style={{ fontSize: 12, color: '#475569', marginLeft: 12 }}>Edit the nudges above and regenerate, or tweak the fields below.</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── The job form (editable) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 }}>
        {aiGenerated && <div style={{ fontSize: 12, color: '#B45309', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '8px 12px' }}>✨ Generated by Levl1 AI — review &amp; edit before publishing.</div>}

        {generating ? <FormSkeleton /> : (
          <>
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
              <label style={label}>Client (optional)</label>
              <ClientPicker value={clientId} onChange={(id) => setClientId(id)} />
            </div>
            <div>
              <label style={label}>Job Description</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['paste', 'upload'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setJdMode(m)} style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (jdMode === m ? purple : '#E2E8F0'), background: jdMode === m ? 'rgba(109,40,217,0.08)' : '#fff', color: jdMode === m ? purple : '#64748B', cursor: 'pointer' }}>{m === 'paste' ? 'Paste / edit' : 'Upload JD (PDF/Word)'}</button>
                ))}
              </div>
              {jdMode === 'upload' && (
                <div style={{ marginBottom: 10 }}>
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT_ATTR} disabled={jdParsing} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJdFile(f) }} style={{ fontSize: 13 }} />
                  {jdParsing && <span style={{ fontSize: 13, color: '#64748B', marginLeft: 8 }}>Reading & parsing…</span>}
                  {jdNote && !jdParsing && <div style={{ fontSize: 12, color: '#059669', marginTop: 6 }}>✓ {jdNote}</div>}
                </div>
              )}
              <textarea style={{ ...inp, minHeight: 180, resize: 'vertical', lineHeight: 1.6 }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Generate above, or paste a JD here…" />
            </div>

            {/* Structured fields — editable */}
            <StructField label="Must-have skills" hint="role-relevant — power AI matching" value={mustHave} onChange={setMustHave} accent />
            <StructField label="Nice-to-have skills" value={niceToHave} onChange={setNiceToHave} />
            <StructField label="Screening criteria" hint="how candidates are evaluated for THIS role" value={screening} onChange={setScreening} />
            <StructField label="Suggested interview focus" value={focus} onChange={setFocus} />

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
              <button onClick={save} disabled={saving} style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: purple, color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Publish Job'}</button>
              <button onClick={() => router.push('/hire/jobs')} style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Editable structured field — chips preview + newline editor.
function StructField({ label: l, hint, value, onChange, accent }: { label: string; hint?: string; value: string; onChange: (v: string) => void; accent?: boolean }) {
  const items = value.split('\n').map((x) => x.trim()).filter(Boolean)
  return (
    <div>
      <div style={{ ...label, marginBottom: 6 }}>{l}{hint && <span style={{ fontWeight: 500, color: '#94A3B8' }}> — {hint}</span>}</div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
          {items.map((s, i) => <span key={i} style={accent ? { fontSize: 11, fontWeight: 700, color: '#fff', background: '#6D28D9', borderRadius: 100, padding: '3px 10px' } : { fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 100, padding: '3px 10px' }}>{s}</span>)}
        </div>
      )}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="One per line…" style={{ ...inp, minHeight: 64, resize: 'vertical', fontSize: 13, lineHeight: 1.5 }} />
    </div>
  )
}

function Spinner() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
}

function FormSkeleton() {
  const bar = (w: string, h = 14) => <div style={{ width: w, height: h, borderRadius: 6, background: 'linear-gradient(90deg,#EEF0F5 25%,#F8FAFC 50%,#EEF0F5 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.2s infinite linear' }} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {bar('40%', 16)}
      {bar('100%', 40)}
      {bar('30%', 14)}
      {bar('100%', 120)}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{Array.from({ length: 7 }).map((_, i) => bar(`${60 + (i % 3) * 30}px`, 22))}</div>
      {bar('50%', 14)}
      <div style={{ fontSize: 12.5, color: purple, fontWeight: 600 }}>✨ Levl1 AI is writing a role-specific brief…</div>
    </div>
  )
}
