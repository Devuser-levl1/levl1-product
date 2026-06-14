'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { CandidateSlideOver } from '@/components/hire/candidate-slideover'
import { CANDIDATE_SOURCES } from '@/lib/hire/constants'
import { HireUpgradeWall } from '@/components/hire/upgrade-wall'
import { FILE_ACCEPT_ATTR } from '@/lib/shared/file-constants'

interface Cand { id: string; name: string; email: string; currentTitle: string | null; currentCompany: string | null; currentStage: string; aiScore: number | null; interviewScore: number | null; source: string | null; createdAt: string; job: { id: string; title: string } | null }
interface Job { id: string; title: string; stages?: string[] }

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
function scoreColor(s: number | null) { if (s == null) return '#CBD5E1'; return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444' }

export default function CandidatesPage() {
  const [cands, setCands] = useState<Cand[]>([])
  const [total, setTotal] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [jobId, setJobId] = useState('')
  const [stage, setStage] = useState('')
  const [band, setBand] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [wall, setWall] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [deleteFor, setDeleteFor] = useState<Cand | null>(null)

  const load = useCallback(() => {
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (jobId) qs.set('jobId', jobId)
    if (stage) qs.set('stage', stage)
    qs.set('limit', '100')
    fetch(`/api/hire/candidates?${qs}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setCands(d.candidates); setTotal(d.total) } }).catch(() => {})
  }, [search, jobId, stage])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setJobs(d)).catch(() => {}) }, [])

  const stageOptions = Array.from(new Set(cands.map((c) => c.currentStage)))
  const shown = cands.filter((c) => {
    if (band === '80') return (c.aiScore ?? -1) >= 80
    if (band === '60') return (c.aiScore ?? -1) >= 60 && (c.aiScore ?? -1) < 80
    if (band === 'lt60') return c.aiScore != null && c.aiScore < 60
    if (band === 'none') return c.aiScore == null
    return true
  })

  async function del(reason: string) {
    if (!deleteFor) return
    await fetch(`/api/hire/candidates/${deleteFor.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    setDeleteFor(null); setMenu(null); load()
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Candidates</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{ ...inp, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>⬆ Import</button>
          <button onClick={() => setShowAdd(true)} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add Candidate</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" style={{ ...inp, flex: 1, minWidth: 200 }} />
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={inp}><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} style={inp}><option value="">All stages</option>{stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={band} onChange={(e) => setBand(e.target.value)} style={inp}><option value="">All scores</option><option value="80">80+</option><option value="60">60–79</option><option value="lt60">&lt;60</option><option value="none">Not scored</option></select>
      </div>

      <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 10 }}>{shown.length} of {total} candidate{total !== 1 ? 's' : ''}</div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14 }}>
        {shown.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No candidates found.</div>}
        {shown.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < shown.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelected(c.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{c.name}</span>
                {c.interviewScore != null && <span title="Levl1 AI interview score" style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", background: "rgba(124,58,237,0.10)", borderRadius: 100, padding: "2px 8px" }}>🎤 {c.interviewScore}</span>}
                {c.source && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>{c.source}</span>}
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || c.email}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{c.job?.title ?? 'No job'} · {c.currentStage} · {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 48 }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: scoreColor(c.aiScore) }}>{c.aiScore ?? '—'}</div>
              <div style={{ fontSize: 9, color: '#CBD5E1' }}>score</div>
            </div>
            <button onClick={() => setSelected(c.id)} style={{ ...inp, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>View</button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenu(menu === c.id ? null : c.id)} style={{ ...inp, cursor: 'pointer' }}>⋯</button>
              {menu === c.id && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 16px rgba(15,23,42,0.1)', zIndex: 10, minWidth: 130 }}>
                  <MenuItem onClick={() => { setSelected(c.id); setMenu(null) }}>View / Edit</MenuItem>
                  <MenuItem onClick={() => { setSelected(c.id); setMenu(null) }}>Add Note</MenuItem>
                  <MenuItem danger onClick={() => { setDeleteFor(c); setMenu(null) }}>Delete</MenuItem>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && <CandidateSlideOver candidateId={selected} onClose={() => setSelected(null)} onChanged={load} />}
      {showAdd && <AddModal jobs={jobs} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} onLimit={(m) => { setShowAdd(false); setWall(m) }} />}
      {showImport && <ImportModal jobs={jobs} onClose={() => setShowImport(false)} onDone={() => { load() }} />}
      {wall && <HireUpgradeWall message={wall} onClose={() => setWall(null)} />}
      {deleteFor && <DeleteModal candidate={deleteFor} onCancel={() => setDeleteFor(null)} onConfirm={del} />}
    </div>
  )
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#DC2626' : '#334155' }}>{children}</button>
}
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}><div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, maxHeight: '90vh', overflowY: 'auto' }}>{children}</div></div>
}

function AddModal({ jobs, onClose, onSaved, onLimit }: { jobs: Job[]; onClose: () => void; onSaved: () => void; onLimit: (msg: string) => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', currentRole: '', currentCompany: '', jobId: '', stage: 'Sourced', source: 'LinkedIn', resumeText: '' })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('')
  const [parsing, setParsing] = useState(false); const [parsedNote, setParsedNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function handleResume(file: File) {
    setParsing(true); setErr(''); setParsedNote('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/hire/parse-resume', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not read resume'); return }
      setF((p) => ({
        ...p,
        name: d.name || p.name,
        email: d.email || p.email,
        phone: d.phone || p.phone,
        currentRole: d.currentTitle || p.currentRole,
        currentCompany: d.currentCompany || p.currentCompany,
        source: 'Resume Upload',
        resumeText: d.resumeText || p.resumeText,
      }))
      setParsedNote(`✓ Auto-filled from ${file.name}`)
    } catch {
      setErr('Something went wrong reading the file')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save() {
    if (!f.name || !f.email) { setErr('Name and email required'); return }
    setSaving(true)
    const res = await fetch('/api/hire/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, jobId: f.jobId || null }) })
    setSaving(false)
    if (res.ok) { onSaved(); return }
    const d = await res.json()
    if (res.status === 402) { onLimit(d.message ?? 'Upgrade to add more candidates.'); return }
    setErr(d.error ?? 'Failed')
  }
  return <Overlay onClose={onClose}>
    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Add Candidate</div>
    <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Upload a resume to auto-fill</div>
      <input ref={fileRef} type="file" accept={FILE_ACCEPT_ATTR} disabled={parsing} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleResume(file) }} style={{ fontSize: 13 }} />
      {parsing && <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Reading & extracting…</div>}
      {parsedNote && !parsing && <div style={{ fontSize: 12, color: '#059669', marginTop: 6 }}>{parsedNote}</div>}
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>PDF, Word (.docx/.doc) or .txt — up to 10MB.</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input style={inp} placeholder="Full name" value={f.name} onChange={(e) => set('name', e.target.value)} />
      <input style={inp} placeholder="Email" value={f.email} onChange={(e) => set('email', e.target.value)} />
      <input style={inp} placeholder="Phone" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
      <input style={inp} placeholder="Current role" value={f.currentRole} onChange={(e) => set('currentRole', e.target.value)} />
      <select style={inp} value={f.jobId} onChange={(e) => set('jobId', e.target.value)}><option value="">No job</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
      <select style={inp} value={f.source} onChange={(e) => set('source', e.target.value)}>{CANDIDATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <textarea style={{ ...inp, minHeight: 90 }} placeholder="Resume text (optional — enables AI scoring when a job is selected)" value={f.resumeText} onChange={(e) => set('resumeText', e.target.value)} />
      {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Adding…' : 'Add Candidate'}</button>
      </div>
    </div>
  </Overlay>
}

function DeleteModal({ candidate, onCancel, onConfirm }: { candidate: Cand; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return <Overlay onClose={onCancel}>
    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Delete {candidate.name}?</div>
    <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>This permanently removes the candidate and their activity. Add a reason for the audit log.</div>
    <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} placeholder="Reason (e.g. duplicate, withdrew)" value={reason} onChange={(e) => setReason(e.target.value)} />
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
      <button onClick={() => onConfirm(reason)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
    </div>
  </Overlay>
}

function ImportModal({ jobs, onClose, onDone, initialTab = 'csv' }: { jobs: Job[]; onClose: () => void; onDone: () => void; initialTab?: 'csv' | 'resumes' | 'files' }) {
  const [tab, setTab] = useState<'csv' | 'resumes' | 'files'>(initialTab)
  const [csv, setCsv] = useState('')
  const [resumes, setResumes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [jobId, setJobId] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null)

  // Bulk file upload: send files one at a time to the (multipart) bulk-import
  // endpoint so we can show live progress and aggregate a single summary.
  async function uploadFiles() {
    if (files.length === 0) { setResult({ created: 0, failed: 0, errors: ['No files selected'] }); return }
    setBusy(true)
    const agg = { created: 0, failed: 0, errors: [] as string[] }
    for (let i = 0; i < files.length; i++) {
      setProgress({ done: i, total: files.length })
      try {
        const fd = new FormData()
        if (jobId) fd.append('jobId', jobId)
        fd.append('files', files[i])
        const res = await fetch('/api/hire/candidates/bulk-import', { method: 'POST', body: fd })
        const d = await res.json()
        agg.created += d.created ?? 0
        agg.failed += d.failed ?? 0
        if (Array.isArray(d.errors)) agg.errors.push(...d.errors)
      } catch (e) {
        agg.failed++
        agg.errors.push(`${files[i].name}: ${e instanceof Error ? e.message : 'upload failed'}`)
      }
    }
    setProgress({ done: files.length, total: files.length })
    setResult(agg); setBusy(false); onDone()
  }

  function parseCsv(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    return lines.slice(1).map((line) => {
      const cells = line.split(',')
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim() })
      return { name: row.name, email: row.email, phone: row.phone, currentRole: row.currentrole || row['current role'] }
    })
  }

  async function importCsv() {
    const rows = parseCsv(csv)
    if (rows.length === 0) { setResult({ created: 0, failed: 0, errors: ['No valid rows found'] }); return }
    setBusy(true)
    const res = await fetch('/api/hire/candidates/bulk-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ importType: 'csv', jobId: jobId || null, candidates: rows }) })
    setResult(await res.json()); setBusy(false); onDone()
  }
  async function importResumes() {
    const blocks = resumes.split(/\n-{3,}\n/).map((s) => s.trim()).filter(Boolean)
    if (blocks.length === 0) { setResult({ created: 0, failed: 0, errors: ['No resumes found (separate with ---)'] }); return }
    setBusy(true)
    const res = await fetch('/api/hire/candidates/bulk-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ importType: 'resumes', jobId: jobId || null, candidates: blocks.map((resumeText) => ({ resumeText })) }) })
    setResult(await res.json()); setBusy(false); onDone()
  }

  return <Overlay onClose={onClose}>
    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Import Candidates</div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {(['files', 'csv', 'resumes'] as const).map((t) => <button key={t} onClick={() => { setTab(t); setResult(null); setProgress(null) }} style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (tab === t ? '#4F46E5' : '#E2E8F0'), background: tab === t ? 'rgba(79,70,229,0.08)' : '#fff', color: tab === t ? '#4F46E5' : '#64748B', cursor: 'pointer' }}>{t === 'files' ? 'Upload Resumes' : t === 'csv' ? 'CSV Import' : 'Resume Paste'}</button>)}
    </div>

    {result ? (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginBottom: 6 }}>✓ {result.created} added · ✗ {result.failed} failed</div>
        {result.errors.length > 0 && <ul style={{ fontSize: 12, color: '#94A3B8', maxHeight: 120, overflowY: 'auto', paddingLeft: 18 }}>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        <button onClick={onClose} style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
      </div>
    ) : tab === 'files' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#64748B' }}>Select multiple resumes (.pdf/.docx/.doc/.txt). Each is parsed, created, and queued for AI scoring when a job is selected.</div>
        <select style={inp} value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">No job (no scoring)</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
        <input type="file" multiple accept={FILE_ACCEPT_ATTR} disabled={busy} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} style={{ fontSize: 13 }} />
        {files.length > 0 && <div style={{ fontSize: 12, color: '#475569' }}>{files.length} file{files.length !== 1 ? 's' : ''} selected</div>}
        {busy && progress && <div style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>Processing {Math.min(progress.done + 1, progress.total)} of {progress.total}…</div>}
        <button onClick={uploadFiles} disabled={busy || files.length === 0} style={{ padding: 11, borderRadius: 8, border: 'none', background: files.length === 0 ? '#CBD5E1' : '#4F46E5', color: '#fff', fontWeight: 700, cursor: busy || files.length === 0 ? 'default' : 'pointer' }}>{busy ? 'Uploading…' : `Upload & Parse ${files.length || ''} resume${files.length !== 1 ? 's' : ''}`}</button>
      </div>
    ) : tab === 'csv' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#64748B' }}>Expected columns: <code>name, email, phone, currentRole</code></div>
        <select style={inp} value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">No job</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
        <textarea style={{ ...inp, minHeight: 140, fontFamily: 'monospace' }} placeholder={'name,email,phone,currentRole\nAsha R,asha@x.com,99999,BI Lead'} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <button onClick={importCsv} disabled={busy} style={{ padding: 11, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Importing…' : 'Import All'}</button>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#64748B' }}>Paste multiple resumes separated by a line with <code>---</code>. AI extracts name/email.</div>
        <select style={inp} value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">No job (no scoring)</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
        <textarea style={{ ...inp, minHeight: 160 }} placeholder={'Resume 1 text…\n---\nResume 2 text…'} value={resumes} onChange={(e) => setResumes(e.target.value)} />
        <button onClick={importResumes} disabled={busy} style={{ padding: 11, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Extracting…' : 'Extract & Import'}</button>
      </div>
    )}
  </Overlay>
}
