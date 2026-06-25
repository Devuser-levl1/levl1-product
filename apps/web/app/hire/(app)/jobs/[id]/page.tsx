'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { StagesEditor } from '@/components/hire/stages-editor'
import { KanbanBoard, KanbanCandidate, KanbanStage } from '@/components/hire/pipeline/KanbanBoard'
import { CandidateSlideOver } from '@/components/hire/candidate-slideover'
import { DistributePanel } from '@/components/hire/distribute-panel'
import { TopMatches } from '@/components/hire/top-matches'
import { RubricEditor, RubricItem } from '@/components/hire/rubric-editor'
import { SourcingTab } from '@/components/hire/sourcing-tab'
import { ClientPicker } from '@/components/hire/client-picker'

interface Candidate { id: string; name: string; email: string; currentStage: string; aiScore: number | null; aiRecommendation: string | null; createdAt: string }
interface Job { id: string; title: string; description: string; department: string | null; location: string | null; salaryMin: number | null; salaryMax: number | null; status: string; stages: string[]; applySlug: string; client: { id: string; name: string } | null; candidates: Candidate[]; mustHaveSkills?: string[]; niceToHaveSkills?: string[]; screeningCriteria?: string[]; interviewFocus?: string[]; aiGenerated?: boolean; rubric?: RubricItem[] | null; deals?: { id: string; title: string; value: number; stage: string; probability: number }[] }

const lakh = (n: number) => `₹${(n / 100000).toFixed(0)}L`
const TABS = ['Overview', 'Pipeline', 'Top Matches', 'Candidates', 'Sourcing', 'Activity', 'Distribute', 'Settings'] as const
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, color: '#475569', fontSize: 14 }
const ghostBtn: React.CSSProperties = { padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }

export default function JobDetailPage() {
  const params = useParams(); const router = useRouter()
  const id = String(params?.id ?? '')
  const [job, setJob] = useState<Job | null>(null)
  const [tab, setTab] = useState<typeof TABS[number]>('Overview')

  const load = useCallback(() => {
    fetch(`/api/hire/jobs/${id}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && !d.error) setJob(d) }).catch(() => {})
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'settings') setTab('Settings')
  }, [])

  if (!job) return <div style={{ color: '#475569' }}>Loading…</div>
  const applyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/hire/apply/${job.applySlug}`

  return (
    <div style={{ maxWidth: 860 }}>
      <button onClick={() => router.push('/hire/jobs')} style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>← All jobs</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{job.title}</h1>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>{[job.client?.name, job.department, job.location].filter(Boolean).join(' · ') || '—'}</div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t ? '#6D28D9' : 'transparent'), color: tab === t ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && <Overview job={job} reload={load} />}
      {tab === 'Top Matches' && <TopMatches jobId={job.id} jobTitle={job.title} onChanged={load} />}
      {tab === 'Candidates' && <Candidates job={job} applyUrl={applyUrl} reload={load} />}
      {tab === 'Sourcing' && <SourcingTab job={job} />}
      {tab === 'Activity' && <JobActivity jobId={job.id} />}
      {tab === 'Pipeline' && <PipelineTab jobId={job.id} />}
      {tab === 'Distribute' && <DistributePanel jobId={job.id} />}
      {tab === 'Settings' && <Settings job={job} reload={load} onDeleted={() => router.push('/hire/jobs')} />}
    </div>
  )
}

function Overview({ job, reload }: { job: Job; reload: () => void }) {
  const perStage = job.stages.map((s) => ({ stage: s, count: job.candidates.filter((c) => c.currentStage === s).length }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
          {job.aiGenerated && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.1)', borderRadius: 100, padding: '2px 8px' }}>✨ AI-generated</span>}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{job.description}</div>
      </div>

      {((job.mustHaveSkills?.length ?? 0) > 0 || (job.niceToHaveSkills?.length ?? 0) > 0 || (job.screeningCriteria?.length ?? 0) > 0 || (job.interviewFocus?.length ?? 0) > 0) && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Role requirements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ChipList title="Must-have skills" items={job.mustHaveSkills ?? []} accent />
            <ChipList title="Nice to have" items={job.niceToHaveSkills ?? []} />
            <BulletList title="Screening criteria" items={job.screeningCriteria ?? []} />
            <BulletList title="Interview focus" items={job.interviewFocus ?? []} />
          </div>
        </div>
      )}

      <RubricEditor
        jobId={job.id}
        initial={Array.isArray(job.rubric) ? job.rubric : []}
        mustHaveSkills={job.mustHaveSkills ?? []}
        niceToHaveSkills={job.niceToHaveSkills ?? []}
        onSaved={reload}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Info label="Salary" value={job.salaryMin || job.salaryMax ? `${job.salaryMin ? lakh(job.salaryMin) : '–'} – ${job.salaryMax ? lakh(job.salaryMax) : '–'}` : '—'} />
        <Info label="Location" value={job.location ?? '—'} />
        <Info label="Client" value={job.client?.name ?? '—'} />
      </div>
      {(job.deals?.length ?? 0) > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Linked deals · {job.deals!.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {job.deals!.map((d) => (
              <a key={d.id} href="/hire/crm" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', flex: 1 }}>{d.title}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{d.stage}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6D28D9' }}>₹{Math.round(d.value).toLocaleString('en-IN')}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Pipeline · {job.candidates.length} candidates</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {perStage.map((p) => (
            <span key={p.stage} style={{ fontSize: 12, fontWeight: 600, color: '#6D28D9', background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.2)', borderRadius: 100, padding: '5px 12px' }}>{p.stage} · {p.count}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
function Info({ label, value }: { label: string; value: string }) {
  return <div style={card}><div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{value}</div></div>
}
function ChipList({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  if (!items.length) return null
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {items.map((s, i) => <span key={i} style={accent ? { fontSize: 11, fontWeight: 700, color: '#fff', background: '#6D28D9', borderRadius: 100, padding: '3px 10px' } : { fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 100, padding: '3px 10px' }}>{s}</span>)}
      </div>
    </div>
  )
}
function BulletList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  )
}

function Candidates({ job, applyUrl, reload }: { job: Job; applyUrl: string; reload: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', resumeText: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function add() {
    if (!form.name || !form.email) return
    setSaving(true)
    await fetch('/api/hire/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, jobId: job.id }) })
    setSaving(false); setShowAdd(false); setForm({ name: '', email: '', phone: '', resumeText: '' }); reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => setShowAdd(true)} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add Candidate</button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>Public apply link: <a href={applyUrl} style={{ color: '#6D28D9' }}>{applyUrl}</a></div>
      </div>
      {job.stages.map((stage) => {
        const list = job.candidates.filter((c) => c.currentStage === stage)
        if (list.length === 0) return null
        return (
          <div key={stage} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>{stage} ({list.length})</div>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}>
              {list.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < list.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 12, color: '#475569' }}>{c.email}</div></div>
                  {typeof c.aiScore === 'number' ? <span style={{ fontFamily: 'monospace', fontWeight: 800, color: c.aiScore >= 70 ? '#10B981' : c.aiScore >= 55 ? '#F59E0B' : '#EF4444' }}>{c.aiScore}</span> : <span style={{ fontSize: 12, color: '#64748B' }}>scoring…</span>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {job.candidates.length === 0 && <div style={card}>No candidates yet. Share the public apply link or add one manually.</div>}

      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Add Candidate</div>
            {(['name', 'email', 'phone'] as const).map((k) => <input key={k} placeholder={k[0].toUpperCase() + k.slice(1)} value={form[k]} onChange={(e) => set(k, e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14 }} />)}
            <textarea placeholder="Resume text (optional)" value={form.resumeText} onChange={(e) => set('resumeText', e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, minHeight: 80 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={add} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Adding…' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Settings({ job, reload, onDeleted }: { job: Job; reload: () => void; onDeleted: () => void }) {
  const [title, setTitle] = useState(job.title)
  const [description, setDescription] = useState(job.description)
  const [stages, setStages] = useState<string[]>(job.stages)
  const [msg, setMsg] = useState('')
  const j = job as unknown as { aiAutoAdvance?: boolean; aiAutoAdvanceThreshold?: number; aiAutoAdvanceStage?: string | null }
  const [autoAdv, setAutoAdv] = useState(!!j.aiAutoAdvance)
  const [autoThresh, setAutoThresh] = useState(j.aiAutoAdvanceThreshold ?? 75)
  const [autoStage, setAutoStage] = useState(j.aiAutoAdvanceStage ?? '')
  const [clientId, setClientId] = useState(job.client?.id ?? '')

  async function save() {
    const res = await fetch(`/api/hire/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, stages, clientId: clientId || null, aiAutoAdvance: autoAdv, aiAutoAdvanceThreshold: autoThresh, aiAutoAdvanceStage: autoStage || null }) })
    const d = await res.json()
    setMsg(res.ok ? 'Saved.' : (d.error ?? 'Save failed')); if (res.ok) reload()
  }
  async function setStatus(status: string) { await fetch(`/api/hire/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); reload() }
  async function del() { if (!confirm('Delete this job permanently? Candidates will be detached.')) return; await fetch(`/api/hire/jobs/${job.id}`, { method: 'DELETE' }); onDeleted() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, ...card }}>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Title</div><input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, width: '100%', boxSizing: 'border-box' }} /></div>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Description</div><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, width: '100%', boxSizing: 'border-box', minHeight: 120 }} /></div>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Client</div><ClientPicker value={clientId} onChange={(id) => setClientId(id)} /></div>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Pipeline Stages</div><StagesEditor stages={stages} onChange={setStages} /></div>
      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoAdv} onChange={(e) => setAutoAdv(e.target.checked)} />
          Auto-advance candidates when their Levl1 AI interview scores above
          <input type="number" value={autoThresh} onChange={(e) => setAutoThresh(Number(e.target.value))} style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0' }} disabled={!autoAdv} />
        </label>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>Move to stage:</span>
          <select value={autoStage} onChange={(e) => setAutoStage(e.target.value)} disabled={!autoAdv} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 13 }}>
            <option value="">Select stage…</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Off by default — you stay in control. Applies after an AI interview report syncs back.</div>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg === 'Saved.' ? '#10B981' : '#DC2626' }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={save} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save changes</button>
        {job.status !== 'PAUSED' && <button onClick={() => setStatus('PAUSED')} style={ghostBtn}>Pause</button>}
        {job.status === 'PAUSED' && <button onClick={() => setStatus('ACTIVE')} style={ghostBtn}>Resume</button>}
        {job.status !== 'CLOSED' && <button onClick={() => setStatus('CLOSED')} style={ghostBtn}>Close</button>}
        <button onClick={del} style={{ ...ghostBtn, color: '#DC2626', borderColor: '#FECACA', marginLeft: 'auto' }}>Delete job</button>
      </div>
    </div>
  )
}

interface JobActivityItem { id: string; type: string; note: string | null; fromStage: string | null; toStage: string | null; createdAt: string; candidateName: string }
function JobActivity({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<JobActivityItem[] | null>(null)
  useEffect(() => { fetch(`/api/hire/jobs/${jobId}/activity`).then((r) => (r.ok ? r.json() : null)).then((d) => setItems(d?.items ?? [])).catch(() => setItems([])) }, [jobId])
  if (!items) return <div style={card}>Loading…</div>
  if (items.length === 0) return <div style={card}>No activity yet for this job&apos;s candidates.</div>
  return (
    <div style={card}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((a) => (
          <div key={a.id} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#475569' }}>
            <span style={{ color: '#94A3B8', fontSize: 11.5, whiteSpace: 'nowrap', width: 96, flexShrink: 0 }}>{new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ flex: 1 }}>
              <strong style={{ color: '#0F172A', fontWeight: 600 }}>{a.candidateName}</strong>{' '}
              {a.type === 'stage_change' ? `moved ${a.fromStage} → ${a.toStage}` : a.type === 'ai_scored' ? (a.note ?? 'scored by AI') : (a.note ?? a.type)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineTab({ jobId }: { jobId: string }) {
  const [pipeline, setPipeline] = useState<{ id: string; title: string; stages: KanbanStage[] } | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`/api/hire/pipeline?jobId=${jobId}`).then((r) => (r.ok ? r.json() : [])).then((d) => setPipeline(Array.isArray(d) ? (d[0] ?? null) : null)).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  const onMove = useCallback(async (candidateId: string, toStage: string) => {
    setPipeline((prev) => {
      if (!prev) return prev
      const moving = prev.stages.flatMap((s) => s.candidates).find((c) => c.id === candidateId)
      if (!moving) return prev
      return { ...prev, stages: prev.stages.map((stage) => ({ ...stage, candidates: stage.name === toStage ? [...stage.candidates.filter((c) => c.id !== candidateId), { ...moving, currentStage: toStage }] : stage.candidates.filter((c) => c.id !== candidateId) })) }
    })
    await fetch('/api/hire/pipeline/move', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId, toStage }) }).catch(() => {})
  }, [])

  if (!pipeline) return <div style={card}>This job has no active pipeline (it may be paused or closed).</div>
  return (
    <div>
      <KanbanBoard stages={pipeline.stages} jobId={pipeline.id} onMove={onMove} onCandidateClick={(c: KanbanCandidate) => setSelectedCandidateId(c.id)} />
      {selectedCandidateId && <CandidateSlideOver candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} onChanged={load} />}
    </div>
  )
}
