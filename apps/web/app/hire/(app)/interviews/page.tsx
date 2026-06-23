'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { ScorecardModal } from '@/components/hire/scorecard-modal'
import { ScheduleInterviewModal } from '@/components/hire/schedule-interview-modal'
import { EmailComposer } from '@/components/hire/email-composer'

interface Iv {
  id: string; scheduledAt: string; durationMins: number; type: string; status: string; meetLink: string | null
  interviewers: string[]; scorecard: { overall?: string } | null
  candidate: { id: string; name: string; currentStage: string; job: { id: string; title: string } | null }
}

interface PipeCand {
  id: string; name: string; email: string | null; currentStage: string
  aiScore: number | null; aiRecommendation: string | null
  jobId: string | null; jobTitle: string | null
}
interface PipeJob { id: string; title: string; stages: { name: string; candidates: Omit<PipeCand, 'jobId' | 'jobTitle'>[] }[] }

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }

// Mirrors lib/hire/analytics canonicalStage — a stage counts as "interview" when
// its name mentions interview / technical / round (jobs define their own stages).
function isInterviewStage(stage: string): boolean {
  const s = (stage || '').toLowerCase()
  return s.includes('interview') || s.includes('technical') || s.includes('round')
}

function fmtWhen(d: Date): string {
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}
function scoreColor(s: number): string { return s >= 75 ? '#059669' : s >= 50 ? '#D97706' : '#DC2626' }

export default function InterviewsPage() {
  const [ivs, setIvs] = useState<Iv[]>([])
  const [pipe, setPipe] = useState<PipeJob[]>([])
  const [menu, setMenu] = useState<string | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)

  // Modals
  const [scorecardFor, setScorecardFor] = useState<string | null>(null)
  const [rescheduleFor, setRescheduleFor] = useState<Iv | null>(null)
  const [scheduleFor, setScheduleFor] = useState<PipeCand | null>(null)
  const [emailFor, setEmailFor] = useState<PipeCand | { id: string; name: string; email: string | null } | null>(null)
  const [moveSuggest, setMoveSuggest] = useState<Iv | null>(null)

  const loadInterviews = useCallback(() => {
    fetch('/api/hire/interviews').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setIvs(d)).catch(() => {})
  }, [])
  const loadPipeline = useCallback(() => {
    fetch('/api/hire/pipeline').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setPipe(d)).catch(() => {})
  }, [])
  const reload = useCallback(() => { loadInterviews(); loadPipeline() }, [loadInterviews, loadPipeline])
  useEffect(() => { reload() }, [reload])

  const now = Date.now()

  // Interview-stage candidates across all active jobs.
  const interviewStageCands = useMemo<PipeCand[]>(() => {
    const out: PipeCand[] = []
    for (const job of pipe) {
      for (const stage of job.stages) {
        if (!isInterviewStage(stage.name)) continue
        for (const c of stage.candidates) out.push({ ...c, jobId: job.id, jobTitle: job.title })
      }
    }
    return out
  }, [pipe])

  // Candidates that already have an upcoming (SCHEDULED) interview booked.
  const scheduledCandIds = useMemo(() => new Set(ivs.filter((i) => i.status === 'SCHEDULED').map((i) => i.candidate.id)), [ivs])

  // Column 1 — interview-stage candidates with nothing booked yet.
  const toSchedule = useMemo(() => interviewStageCands.filter((c) => !scheduledCandIds.has(c.id)), [interviewStageCands, scheduledCandIds])
  // Column 2 — upcoming interviews, soonest first.
  const scheduled = useMemo(() => ivs.filter((i) => i.status === 'SCHEDULED').sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)), [ivs])
  // Column 3 — done (completed + no-shows), most recent first.
  const completed = useMemo(() => ivs.filter((i) => i.status === 'COMPLETED' || i.status === 'NO_SHOW').sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt)), [ivs])
  const cancelled = useMemo(() => ivs.filter((i) => i.status === 'CANCELLED'), [ivs])

  async function setStatus(i: Iv, status: string) {
    await fetch(`/api/hire/interviews/${i.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setMenu(null); reload()
  }
  async function cancel(i: Iv) {
    if (!confirm('Cancel and remove this interview?')) return
    await fetch(`/api/hire/interviews/${i.id}`, { method: 'DELETE' }); setMenu(null); reload()
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Interviews</h1>
        <span style={{ fontSize: 13, color: '#64748B' }}>Schedule, run and score interviews for candidates in your pipeline.</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 18 }}>
        {toSchedule.length} awaiting scheduling · {scheduled.length} upcoming · {completed.length} completed
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ── Column 1 — To schedule ── */}
        <Column title="To schedule" count={toSchedule.length} accent="#D97706">
          {toSchedule.length === 0 && (
            <Empty>No candidates at the interview stage. Move candidates into an interview stage from <a href="/hire/pipeline" style={{ color: '#6D28D9' }}>Pipeline</a>.</Empty>
          )}
          {toSchedule.map((c) => (
            <Card key={c.id}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{c.jobTitle ?? 'No job'} · {c.currentStage}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {typeof c.aiScore === 'number' && <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor(c.aiScore), background: `${scoreColor(c.aiScore)}14`, borderRadius: 100, padding: '2px 8px' }}>Match {c.aiScore}</span>}
                {c.aiRecommendation && <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 8px' }}>{c.aiRecommendation.replace(/_/g, ' ')}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => setScheduleFor(c)} style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Schedule</button>
                <button onClick={() => setEmailFor(c)} disabled={!c.email} title={c.email ? 'Send a 1:1 email' : 'No email on file'} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #6D28D9', background: '#fff', color: c.email ? '#6D28D9' : '#94A3B8', fontWeight: 700, fontSize: 12, cursor: c.email ? 'pointer' : 'default' }}>✉</button>
              </div>
            </Card>
          ))}
        </Column>

        {/* ── Column 2 — Scheduled ── */}
        <Column title="Scheduled" count={scheduled.length} accent="#6D28D9">
          {scheduled.length === 0 && <Empty>Nothing scheduled yet.</Empty>}
          {scheduled.map((i) => {
            const at = new Date(i.scheduledAt)
            const overdue = at.getTime() < now
            return (
              <Card key={i.id}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{i.candidate.name}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{fmtWhen(at)} · {i.type} · {i.durationMins} min</div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{i.candidate.job?.title ?? 'No job'}{i.interviewers.length ? ` · ${i.interviewers.join(', ')}` : ''}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {overdue && <span style={{ fontSize: 10, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 100, padding: '2px 8px' }}>Needs outcome</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                  {i.meetLink && <a href={i.meetLink} target="_blank" rel="noreferrer" style={{ padding: '7px 10px', borderRadius: 7, fontWeight: 700, fontSize: 12, color: '#6D28D9', border: '1px solid #6D28D9', textDecoration: 'none' }}>Join</a>}
                  <button onClick={() => setScorecardFor(i.id)} style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Complete + score</button>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setMenu(menu === i.id ? null : i.id)} style={{ ...inp, padding: '6px 9px', cursor: 'pointer' }}>⋯</button>
                    {menu === i.id && (
                      <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 16px rgba(15,23,42,0.1)', zIndex: 10, minWidth: 180 }}>
                        <MI onClick={() => { setRescheduleFor(i); setMenu(null) }}>Reschedule</MI>
                        <MI onClick={() => { setEmailFor({ id: i.candidate.id, name: i.candidate.name, email: null }); setMenu(null) }}>Email candidate</MI>
                        <MI onClick={() => setStatus(i, 'NO_SHOW')}>Mark No-show</MI>
                        <MI danger onClick={() => cancel(i)}>Cancel</MI>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </Column>

        {/* ── Column 3 — Completed ── */}
        <Column title="Completed" count={completed.length} accent="#059669">
          {completed.length === 0 && <Empty>No completed interviews yet.</Empty>}
          {completed.map((i) => (
            <Card key={i.id}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{i.candidate.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{fmtWhen(new Date(i.scheduledAt))} · {i.type}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {i.status === 'NO_SHOW' && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>No-show</span>}
                {i.scorecard?.overall && <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 8px' }}>Scorecard: {i.scorecard.overall.replace(/_/g, ' ')}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => setScorecardFor(i.id)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{i.scorecard?.overall ? 'View / edit scorecard' : 'Add scorecard'}</button>
              </div>
            </Card>
          ))}
        </Column>
      </div>

      {/* Cancelled — collapsed by default */}
      {cancelled.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <button onClick={() => setShowCancelled((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>
            {showCancelled ? '▾' : '▸'} Cancelled ({cancelled.length})
          </button>
          {showCancelled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {cancelled.map((i) => (
                <div key={i.id} style={{ fontSize: 12.5, color: '#64748B', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
                  {i.candidate.name} · {fmtWhen(new Date(i.scheduledAt))} · {i.type} · Cancelled
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {scheduleFor && (
        <ScheduleInterviewModal
          candidateId={scheduleFor.id}
          candidateName={scheduleFor.name}
          jobTitle={scheduleFor.jobTitle ?? undefined}
          onClose={() => setScheduleFor(null)}
          onScheduled={() => { setScheduleFor(null); reload() }}
        />
      )}
      {emailFor && <EmailComposer candidateId={emailFor.id} onClose={() => setEmailFor(null)} onSent={() => { setEmailFor(null); reload() }} />}
      {scorecardFor && <ScorecardModal interviewId={scorecardFor} onClose={() => setScorecardFor(null)} onSaved={(overall) => { const iv = ivs.find((x) => x.id === scorecardFor); setScorecardFor(null); reload(); if ((overall === 'strong_yes' || overall === 'yes') && iv) setMoveSuggest(iv) }} />}
      {rescheduleFor && <RescheduleModal iv={rescheduleFor} onClose={() => setRescheduleFor(null)} onSaved={() => { setRescheduleFor(null); reload() }} />}
      {moveSuggest && (
        <div onClick={() => setMoveSuggest(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Strong result 🎉</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>Move {moveSuggest.candidate.name} to the next pipeline stage? You can do this from the pipeline board.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMoveSuggest(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Not now</button>
              <a href="/hire/pipeline" style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>Open pipeline →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Column({ title, count, accent, children }: { title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 320px', minWidth: 300, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 100, padding: '1px 8px' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>{children}</div>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5, padding: '14px 6px' }}>{children}</div>
}
function MI({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#DC2626' : '#334155' }}>{children}</button>
}

function RescheduleModal({ iv, onClose, onSaved }: { iv: Iv; onClose: () => void; onSaved: () => void }) {
  const [when, setWhen] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!when) return
    setSaving(true)
    await fetch(`/api/hire/interviews/${iv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: new Date(when).toISOString() }) })
    setSaving(false); onSaved()
  }
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Reschedule — {iv.candidate.name}</div>
      <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? '…' : 'Reschedule'}</button>
      </div>
    </div>
  </div>
}
