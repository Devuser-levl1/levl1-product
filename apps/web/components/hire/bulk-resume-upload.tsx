'use client'
import { useState } from 'react'
import { FILE_ACCEPT_ATTR } from '@/lib/shared/file-constants'

// Reusable "Bulk upload resumes" modal. Sends files one at a time to the
// multipart bulk-import endpoint so it can show live progress and aggregate
// a single result summary. Used by the Pipeline page (and reusable elsewhere).
export function BulkResumeUpload({ jobId, jobTitle, onClose, onDone }: {
  jobId: string | null
  jobTitle?: string
  onClose: () => void
  onDone: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null)
  const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }

  async function run() {
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, maxWidth: '100%' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Bulk upload resumes</div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>{jobTitle ? <>Candidates will be added to <strong>{jobTitle}</strong> and queued for AI scoring.</> : 'Select a job on the pipeline to enable AI scoring.'}</div>
        {result ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginBottom: 6 }}>✓ {result.created} added · ✗ {result.failed} failed</div>
            {result.errors.length > 0 && <ul style={{ fontSize: 12, color: '#94A3B8', maxHeight: 120, overflowY: 'auto', paddingLeft: 18 }}>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <button onClick={onClose} style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="file" multiple accept={FILE_ACCEPT_ATTR} disabled={busy} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} style={{ fontSize: 13 }} />
            {files.length > 0 && <div style={{ fontSize: 12, color: '#475569' }}>{files.length} file{files.length !== 1 ? 's' : ''} selected</div>}
            {busy && progress && <div style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>Processing {Math.min(progress.done + 1, progress.total)} of {progress.total}…</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={run} disabled={busy || files.length === 0} style={{ ...inp, flex: 1, border: 'none', background: files.length === 0 ? '#CBD5E1' : '#4F46E5', color: '#fff', fontWeight: 700, cursor: busy || files.length === 0 ? 'default' : 'pointer', padding: 10 }}>{busy ? 'Uploading…' : 'Upload & Parse'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
