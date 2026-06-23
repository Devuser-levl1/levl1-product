'use client'
import { useState, useEffect, useCallback } from 'react'
import { KanbanBoard, KanbanCandidate, KanbanStage } from '@/components/hire/pipeline/KanbanBoard'
import { CandidateSlideOver } from '@/components/hire/candidate-slideover'
import { BulkResumeUpload } from '@/components/hire/bulk-resume-upload'
import { ReasonModal } from '@/components/hire/pipeline/ReasonModal'
import { REJECT_REASONS, DELETE_REASONS } from '@/lib/hire/lifecycle'

interface JobPipeline { id: string; title: string; stages: KanbanStage[]; totalCandidates: number }

export default function PipelinePage() {
  const [jobs, setJobs] = useState<JobPipeline[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rejectFor, setRejectFor] = useState<KanbanCandidate | null>(null)
  const [deleteFor, setDeleteFor] = useState<KanbanCandidate | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/pipeline').then((r) => (r.ok ? r.json() : [])).then((data: JobPipeline[]) => {
      setJobs(Array.isArray(data) ? data : [])
      setSelectedJobId((prev) => prev ?? (data[0]?.id ?? null))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const handleMove = useCallback(async (candidateId: string, toStage: string) => {
    // Optimistic update
    setJobs((prev) => prev.map((job) => {
      const moving = job.stages.flatMap((s) => s.candidates).find((c) => c.id === candidateId)
      if (!moving) return job
      return {
        ...job,
        stages: job.stages.map((stage) => ({
          ...stage,
          candidates: stage.name === toStage
            ? [...stage.candidates.filter((c) => c.id !== candidateId), { ...moving, currentStage: toStage }]
            : stage.candidates.filter((c) => c.id !== candidateId),
        })),
      }
    }))
    await fetch('/api/hire/pipeline/move', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId, toStage }) }).catch(() => {})
  }, [])

  const submitReject = useCallback(async (reason: string) => {
    if (!rejectFor) return
    const res = await fetch('/api/hire/pipeline/reject', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId: rejectFor.id, reason }) })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to reject') }
    setRejectFor(null); load()
  }, [rejectFor, load])

  const submitDelete = useCallback(async (reason: string) => {
    if (!deleteFor) return
    const res = await fetch(`/api/hire/candidates/${deleteFor.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to delete') }
    setDeleteFor(null); load()
  }, [deleteFor, load])

  // Keyboard shortcuts: Esc closes slide-over, ←/→ switch job tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCandidateId(null)
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && jobs.length > 1 && !selectedCandidateId) {
        const idx = jobs.findIndex((j) => j.id === selectedJobId)
        const next = e.key === 'ArrowRight' ? Math.min(jobs.length - 1, idx + 1) : Math.max(0, idx - 1)
        setSelectedJobId(jobs[next].id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [jobs, selectedJobId, selectedCandidateId])

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  if (loading) return <div style={{ color: '#475569' }}>Loading pipeline…</div>
  if (jobs.length === 0) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>No active jobs</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Create a job to start managing your pipeline</div>
      <a href="/hire/jobs/new" style={{ display: 'inline-block', marginTop: 16, background: '#6D28D9', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>Create First Job →</a>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>Pipeline</h1>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>Drag candidates across stages to update their progress</p>
        </div>
        <button onClick={() => setShowBulk(true)} style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>⬆ Bulk upload resumes</button>
      </div>

      {jobs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 12, flexWrap: 'wrap' }}>
          {jobs.map((job) => (
            <button key={job.id} onClick={() => setSelectedJobId(job.id)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: selectedJobId === job.id ? '#6D28D9' : '#F1F5F9', color: selectedJobId === job.id ? 'white' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{job.title} ({job.totalCandidates})</button>
          ))}
        </div>
      )}

      {selectedJob && (
        <KanbanBoard stages={selectedJob.stages} jobId={selectedJob.id} onMove={handleMove}
          onReject={(c) => setRejectFor(c)} onDelete={(c) => setDeleteFor(c)}
          onCandidateClick={(c: KanbanCandidate) => setSelectedCandidateId(c.id)} />
      )}

      {rejectFor && (
        <ReasonModal
          title={`Reject ${rejectFor.name}`}
          description="Moves the candidate to the Rejected swimlane. A reason is required and is recorded in the audit log."
          presets={REJECT_REASONS as readonly string[]}
          confirmLabel="Reject candidate"
          danger
          onClose={() => setRejectFor(null)}
          onConfirm={submitReject}
        />
      )}

      {deleteFor && (
        <ReasonModal
          title={`Delete ${deleteFor.name}`}
          description="Permanently removes the candidate and their interviews. A reason is required and is logged in the audit trail."
          presets={DELETE_REASONS as readonly string[]}
          confirmLabel="Delete permanently"
          danger
          onClose={() => setDeleteFor(null)}
          onConfirm={submitDelete}
        />
      )}

      {selectedCandidateId && (
        <CandidateSlideOver candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} onChanged={load} />
      )}

      {showBulk && (
        <BulkResumeUpload jobId={selectedJobId} jobTitle={selectedJob?.title} onClose={() => setShowBulk(false)} onDone={load} />
      )}
    </div>
  )
}
