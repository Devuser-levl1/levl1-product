'use client'
import { useEffect, useState, useCallback } from 'react'
import { ScheduleInterviewModal } from '@/components/hire/schedule-interview-modal'
import { EnrichmentPanel } from '@/components/hire/enrichment-panel'
import { BestFitJobs } from '@/components/hire/best-fit-jobs'
import { EmailComposer } from '@/components/hire/email-composer'

interface Activity { id: string; type: string; note: string | null; fromStage: string | null; toStage: string | null; createdAt: string }
interface Candidate {
  id: string; name: string; email: string; phone: string | null; currentTitle: string | null; currentCompany: string | null; linkedinUrl: string | null
  currentStage: string; aiScore: number | null; aiSummary: string | null; aiRecommendation: string | null; source: string | null
  totalYears: number | null; resumeText: string | null
  skills: string[] | null; topSkills: string[] | null; job: { id: string; title: string; stages: string[] } | null; activities: Activity[]
}

const REC: Record<string, string> = { strong_yes: 'Strong Yes', yes: 'Yes', maybe: 'Maybe', no: 'No' }
function scoreColor(s: number) { return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444' }
const TABS = ['Summary', 'Resume', 'Matches', 'Activity', 'Notes'] as const
type Tab = typeof TABS[number]

export function CandidateSlideOver({ candidateId, onClose, onChanged }: { candidateId: string; onClose: () => void; onChanged: () => void }) {
  const [c, setC] = useState<Candidate | null>(null)
  const [tab, setTab] = useState<Tab>('Summary')
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

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
  function downloadResume() {
    if (!c?.resumeText) return
    const blob = new Blob([c.resumeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${c.name.replace(/\s+/g, '_')}_resume.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const stages = c?.job?.stages ?? []
  const notes = (c?.activities ?? []).filter((a) => a.type === 'note')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '100%', height: '100%', background: '#fff', overflowY: 'auto', boxShadow: '-8px 0 30px rgba(15,23,42,0.12)' }}>
        {!c ? <div style={{ padding: 32, color: '#475569' }}>Loading…</div> : (
          <div>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>{c.name}</h2>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || c.email || c.job?.title || '—'}</div>
                </div>
                <button onClick={onClose} style={{ marginLeft: 'auto', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E2E8F0', marginTop: 16 }}>
                {TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === t ? '#6D28D9' : 'transparent'), color: tab === t ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>
                    {t}{t === 'Notes' && notes.length > 0 ? ` (${notes.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {tab === 'Summary' && (
                <>
                  <Sec title="AI Assessment" first>
                    {(typeof c.aiScore === 'number' || c.aiSummary || (c.topSkills?.length ?? 0) > 0 || (c.skills?.length ?? 0) > 0) ? (
                      <>
                        {typeof c.aiScore === 'number' && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 800, color: scoreColor(c.aiScore) }}>{c.aiScore}<span style={{ fontSize: 13, color: '#475569' }}>/100</span></span>
                              {c.aiRecommendation && <span style={{ fontSize: 13, fontWeight: 700, color: '#6D28D9' }}>{REC[c.aiRecommendation] ?? c.aiRecommendation}</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>AI match {c.job ? <>vs <strong>{c.job.title}</strong></> : ''}</div>
                          </div>
                        )}
                        {c.aiSummary && <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}>{c.aiSummary}</p>}
                        {Array.isArray(c.topSkills) && c.topSkills.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={skillsLabel}>Top skills · role-relevant</div>
                            <div style={chipRow}>{c.topSkills.map((s) => <span key={s} style={topChip}>{s}</span>)}</div>
                          </div>
                        )}
                        {Array.isArray(c.skills) && c.skills.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={skillsLabel}>All skills · from résumé</div>
                            <div style={chipRow}>{c.skills.map((s) => <span key={s} style={allChip}>{s}</span>)}</div>
                          </div>
                        )}
                        {typeof c.aiScore !== 'number' && <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 8 }}>Not scored against a job yet — attach to a job to score.</div>}
                      </>
                    ) : <div style={{ fontSize: 13, color: '#475569' }}>Not scored yet{c.job ? ' — scoring runs shortly after a resume is added.' : ' (link to a job + add resume text to score).'}</div>}
                  </Sec>

                  <EnrichmentPanel candidateId={c.id} />

                  <Sec title="Pipeline">
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{c.job ? c.job.title : 'No job assigned'}</div>
                    {stages.length > 0 ? (
                      <select value={c.currentStage} onChange={(e) => changeStage(e.target.value)} style={selectStyle}>
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <div style={{ fontSize: 13, color: '#334155' }}>Stage: {c.currentStage}</div>}
                    <button onClick={() => setShowSchedule(true)} style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Schedule Interview</button>
                  </Sec>

                  <Sec title="Contact">
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details yet'}
                      {c.totalYears != null ? <div style={{ fontSize: 12, color: '#475569' }}>{c.totalYears} yrs experience</div> : null}
                      {c.linkedinUrl ? <div><a href={c.linkedinUrl} style={{ color: '#6D28D9' }}>{c.linkedinUrl}</a></div> : null}
                      {c.source ? <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Source: {c.source}</div> : null}
                    </div>
                    <button onClick={() => setShowEmail(true)} disabled={!c.email} title={c.email ? 'Send a 1:1 email' : 'No email on file'} style={{ marginTop: 10, width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #6D28D9', background: '#fff', color: c.email ? '#6D28D9' : '#94A3B8', fontWeight: 700, fontSize: 13, cursor: c.email ? 'pointer' : 'default' }}>✉ Send email</button>
                  </Sec>
                </>
              )}

              {tab === 'Resume' && (
                <Sec title="Résumé" first>
                  {c.resumeText ? (
                    <>
                      <button onClick={downloadResume} style={{ marginBottom: 12, padding: '8px 13px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#6D28D9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>↓ Download résumé</button>
                      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: 16, maxHeight: 520, overflowY: 'auto' }}>{c.resumeText}</div>
                    </>
                  ) : <div style={{ fontSize: 13, color: '#94A3B8' }}>No résumé on file. Add résumé text when creating or editing this candidate.</div>}
                </Sec>
              )}

              {tab === 'Matches' && (
                <Sec title="Best-fit jobs" first>
                  <BestFitJobs candidateId={c.id} onAttached={() => { load(); onChanged() }} />
                </Sec>
              )}

              {tab === 'Activity' && (
                <Sec title="Activity Timeline" first>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.activities.length === 0 && <div style={{ fontSize: 13, color: '#475569' }}>No activity yet.</div>}
                    {c.activities.map((a) => (
                      <div key={a.id} style={{ fontSize: 12, color: '#475569' }}>
                        <span style={{ color: '#94A3B8' }}>{new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — </span>
                        {a.type === 'stage_change' ? `Moved ${a.fromStage} → ${a.toStage}` : a.type === 'ai_scored' ? (a.note ?? 'AI scored') : (a.note ?? a.type)}
                      </div>
                    ))}
                  </div>
                </Sec>
              )}

              {tab === 'Notes' && (
                <Sec title="Notes" first>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote() }} placeholder="Add a note…" style={{ flex: 1, padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                    <button onClick={addNote} disabled={savingNote} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {notes.length === 0 && <div style={{ fontSize: 13, color: '#94A3B8' }}>No notes yet.</div>}
                    {notes.map((a) => (
                      <div key={a.id} style={{ fontSize: 13, color: '#334155', borderLeft: '2px solid #EDE9FE', paddingLeft: 10 }}>
                        {a.note}
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ))}
                  </div>
                </Sec>
              )}
            </div>
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
      {showEmail && c && <EmailComposer candidateId={c.id} onClose={() => setShowEmail(false)} onSent={() => { load(); onChanged() }} />}
    </div>
  )
}

const selectStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }
const skillsLabel: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }
const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5 }
const topChip: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#fff', background: '#6D28D9', borderRadius: 100, padding: '3px 10px' }
const allChip: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 100, padding: '3px 10px' }
function Sec({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{ marginTop: first ? 0 : 20, paddingTop: first ? 0 : 16, borderTop: first ? 'none' : '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
