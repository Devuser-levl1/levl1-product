'use client'
import { useEffect, useState, useCallback } from 'react'
import { ScheduleInterviewModal } from '@/components/hire/schedule-interview-modal'

interface Activity { id: string; type: string; note: string | null; fromStage: string | null; toStage: string | null; createdAt: string }
interface InterviewLink {
  id: string; status: string; overallScore: number | null; recommendation: string | null; reportUrl: string | null
  scorecard: { sectionScores?: Record<string, { score: number }>; l2Recommended?: boolean } | null
}
interface Candidate {
  id: string; name: string; email: string; phone: string | null; currentTitle: string | null; currentCompany: string | null; linkedinUrl: string | null
  currentStage: string; aiScore: number | null; aiSummary: string | null; aiRecommendation: string | null; source: string | null
  skills: string[] | null; job: { id: string; title: string; stages: string[] } | null; activities: Activity[]; interviews: InterviewLink[]
}

const REC: Record<string, string> = { strong_yes: 'Strong Yes', yes: 'Yes', maybe: 'Maybe', no: 'No' }
function scoreColor(s: number) { return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444' }

export function CandidateSlideOver({ candidateId, onClose, onChanged }: { candidateId: string; onClose: () => void; onChanged: () => void }) {
  const [c, setC] = useState<Candidate | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [setupInfo, setSetupInfo] = useState<{ positionId: string; jobId: string } | null>(null)
  const [settingUp, setSettingUp] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/hire/candidates/${candidateId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && !d.error) setC(d) }).catch(() => {})
  }, [candidateId])
  useEffect(() => { load() }, [load])

  async function changeStage(stage: string) {
    await fetch(`/api/hire/candidates/${candidateId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentStage: stage }) })
    load(); onChanged()
  }
  async function addNote() {
    if (!note.trim()) return
    setSavingNote(true)
    await fetch(`/api/hire/candidates/${candidateId}/note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) })
    setNote(''); setSavingNote(false); load()
  }

  async function triggerInterview() {
    setTriggering(true); setSetupInfo(null)
    try {
      const res = await fetch(`/api/hire/candidates/${candidateId}/trigger-interview`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 409 && data.error === 'question_set_not_ready') { setSetupInfo({ positionId: data.positionId, jobId: data.jobId }); return }
      if (!res.ok) { alert(data.error ?? 'Could not trigger interview'); return }
      load(); onChanged()
    } finally { setTriggering(false) }
  }
  async function quickSetup() {
    if (!setupInfo) return
    setSettingUp(true)
    try {
      const res = await fetch(`/api/hire/jobs/${setupInfo.jobId}/setup-interview`, { method: 'POST' })
      if (!res.ok) { alert('Setup failed'); return }
      setSetupInfo(null)
      await triggerInterview()
    } finally { setSettingUp(false) }
  }

  const stages = c?.job?.stages ?? []
  const link = c?.interviews?.[c.interviews.length - 1] ?? null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', height: '100%', background: '#fff', overflowY: 'auto', boxShadow: '-8px 0 30px rgba(15,23,42,0.12)' }}>
        {!c ? <div style={{ padding: 32, color: '#94A3B8' }}>Loading…</div> : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>{c.name}</h2>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || c.email}</div>
              </div>
              <button onClick={onClose} style={{ marginLeft: 'auto', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>×</button>
            </div>

            <Sec title="AI Assessment">
              {typeof c.aiScore === 'number' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 800, color: scoreColor(c.aiScore) }}>{c.aiScore}<span style={{ fontSize: 13, color: '#94A3B8' }}>/100</span></span>
                    {c.aiRecommendation && <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>{REC[c.aiRecommendation] ?? c.aiRecommendation}</span>}
                  </div>
                  {c.aiSummary && <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}>{c.aiSummary}</p>}
                  {Array.isArray(c.skills) && c.skills.length > 0 && (
                    <div style={{ fontSize: 12, color: '#64748B' }}>Top Skills: {c.skills.join(', ')}</div>
                  )}
                </>
              ) : <div style={{ fontSize: 13, color: '#94A3B8' }}>Not scored yet{c.job ? ' — scoring runs shortly after a resume is added.' : ' (link to a job + add resume text to score).'}</div>}
            </Sec>

            <Sec title="Pipeline">
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{c.job ? c.job.title : 'No job assigned'}</div>
              {stages.length > 0 ? (
                <select value={c.currentStage} onChange={(e) => changeStage(e.target.value)} style={selectStyle}>
                  {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : <div style={{ fontSize: 13, color: '#334155' }}>Stage: {c.currentStage}</div>}
              <button onClick={() => setShowSchedule(true)} style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Schedule Interview</button>
            </Sec>

            <Sec title="AI Interview (Levl1)">
              {!link && !setupInfo && (
                <button onClick={triggerInterview} disabled={triggering} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{triggering ? 'Triggering…' : 'Trigger AI Interview'}</button>
              )}
              {setupInfo && (
                <div style={{ border: '1px solid #FDE68A', background: '#FFFBEB', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>Set up AI interview for this job</div>
                  <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5, marginBottom: 10 }}>Before running AI interviews for “{c?.job?.title}”, generate &amp; approve a question set. Once approved, every triggered candidate is interviewed automatically.</div>
                  <button onClick={quickSetup} disabled={settingUp} style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{settingUp ? 'Setting up…' : 'Generate & approve, then trigger →'}</button>
                  <a href={`/positions/${setupInfo.positionId}`} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: '#4F46E5' }}>Or set up manually in Levl1 Interviews →</a>
                </div>
              )}
              {link && (
                <div>
                  <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>Status: <strong style={{ textTransform: 'capitalize' }}>{link.status.replace('_', ' ')}</strong></div>
                  {link.status === 'completed' ? (
                    <>
                      <div style={{ fontSize: 13, color: '#475569' }}>Overall: <strong style={{ color: link.overallScore != null ? scoreColor(link.overallScore) : '#64748B' }}>{link.overallScore ?? '—'}/100</strong>{link.recommendation ? ` · ${REC[link.recommendation] ?? link.recommendation}` : ''}</div>
                      {link.scorecard?.l2Recommended != null && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>L2 Recommended: {link.scorecard.l2Recommended ? '✓' : '—'}</div>}
                      {link.scorecard?.sectionScores && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{Object.entries(link.scorecard.sectionScores).map(([k, v]) => `${k} ${v.score}`).join(' · ')}</div>}
                      {link.reportUrl && <a href={link.reportUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>View Full Report →</a>}
                    </>
                  ) : link.status === 'failed' ? (
                    <button onClick={triggerInterview} disabled={triggering} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #DC2626', background: '#fff', color: '#DC2626', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Retry</button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#64748B' }}>{link.status === 'in_progress' ? 'Interview in progress…' : 'Invite sent — awaiting candidate'}</span>
                      {link.status !== 'in_progress' && <button onClick={triggerInterview} disabled={triggering} style={{ marginLeft: 'auto', ...selectStyle, width: 'auto', fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>Resend</button>}
                    </div>
                  )}
                </div>
              )}
            </Sec>

            <Sec title="Contact">
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                {c.email}{c.phone ? ` · ${c.phone}` : ''}
                {c.linkedinUrl ? <div><a href={c.linkedinUrl} style={{ color: '#4F46E5' }}>{c.linkedinUrl}</a></div> : null}
                {c.source ? <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Source: {c.source}</div> : null}
              </div>
            </Sec>

            <Sec title="Activity Timeline">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.activities.length === 0 && <div style={{ fontSize: 13, color: '#94A3B8' }}>No activity yet.</div>}
                {c.activities.map((a) => (
                  <div key={a.id} style={{ fontSize: 12, color: '#475569' }}>
                    <span style={{ color: '#94A3B8' }}>{new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — </span>
                    {a.type === 'stage_change' ? `Moved ${a.fromStage} → ${a.toStage}` : a.type === 'ai_scored' ? (a.note ?? 'AI scored') : (a.note ?? a.type)}
                  </div>
                ))}
              </div>
            </Sec>

            <Sec title="Add Note">
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" style={{ flex: 1, padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                <button onClick={addNote} disabled={savingNote} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
              </div>
            </Sec>
          </div>
        )}
      </div>
      {showSchedule && c && (
        <ScheduleInterviewModal
          candidateId={c.id}
          candidateName={c.name}
          jobTitle={c.job?.title}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => { setShowSchedule(false); load(); onChanged() }}
        />
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
