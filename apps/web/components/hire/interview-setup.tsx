'use client'
import { useEffect, useState, useCallback } from 'react'

// In-built AI interview setup — the flow STARTS AT QUESTIONS. No JD upload, no
// resume upload, no parsing screens: the job's description is already on file.
// Generated questions are surfaced for human review + edit + explicit approval.

type Q = { question: string; expectedKeyPoints?: string[] }
type Section = 'technicalQuestions' | 'scenarioQuestions' | 'behavioralQuestions' | 'eqQuestions' | 'whiteboardQuestions'
interface QuestionSet { technicalQuestions: Q[]; scenarioQuestions: Q[]; behavioralQuestions: Q[]; eqQuestions: Q[]; whiteboardQuestions: Q[] }
interface State { state: 'not_setup' | 'pending_approval' | 'active'; approvalMode: 'single' | 'dual'; techLeadApproved: boolean; hrApproved: boolean; questionSet: QuestionSet | null }

const SECTIONS: { key: Section; label: string; hint: string }[] = [
  { key: 'technicalQuestions', label: 'Technical', hint: '6–7 questions' },
  { key: 'scenarioQuestions', label: 'Scenario', hint: '2–3 questions' },
  { key: 'behavioralQuestions', label: 'Behavioral', hint: '2–3 questions' },
  { key: 'eqQuestions', label: 'EQ / Soft skills', hint: '2–3 questions' },
  { key: 'whiteboardQuestions', label: 'Whiteboard', hint: 'optional' },
]

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22 }
const btn: React.CSSProperties = { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }

export function InterviewSetup({ jobId, jobTitle, onGoToCandidates }: { jobId: string; jobTitle: string; onGoToCandidates?: () => void }) {
  const [s, setS] = useState<State | null>(null)
  const [qs, setQs] = useState<Record<Section, string[]>>({ technicalQuestions: [], scenarioQuestions: [], behavioralQuestions: [], eqQuestions: [], whiteboardQuestions: [] })
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const hydrate = (data: State) => {
    setS(data)
    if (data.questionSet) {
      const next = {} as Record<Section, string[]>
      for (const { key } of SECTIONS) next[key] = (data.questionSet[key] ?? []).map((q) => q.question)
      setQs(next)
    }
  }
  const load = useCallback(() => {
    fetch(`/api/hire/jobs/${jobId}/interview-questions`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) hydrate(d) }).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  async function generate() {
    setBusy('gen'); setMsg('')
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/interview-questions/generate`, { method: 'POST' })
      if (!res.ok) { setMsg('Generation failed'); return }
      load()
    } finally { setBusy('') }
  }
  function edit(section: Section, i: number, val: string) { setQs((p) => ({ ...p, [section]: p[section].map((q, idx) => idx === i ? val : q) })) }
  function add(section: Section) { setQs((p) => ({ ...p, [section]: [...p[section], ''] })) }
  function remove(section: Section, i: number) { setQs((p) => ({ ...p, [section]: p[section].filter((_, idx) => idx !== i) })) }

  async function saveEdits() {
    setBusy('save'); setMsg('')
    const questionSet: Record<string, Q[]> = {}
    for (const { key } of SECTIONS) questionSet[key] = qs[key].map((q) => q.trim()).filter(Boolean).map((question) => ({ question, expectedKeyPoints: [] }))
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/interview-questions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionSet }) })
      setMsg(res.ok ? 'Saved.' : 'Save failed')
    } finally { setBusy('') }
  }
  async function setMode(mode: 'single' | 'dual') {
    await fetch(`/api/hire/jobs/${jobId}/interview-questions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvalMode: mode }) })
    load()
  }
  async function approve(role: 'tech_lead' | 'hr') {
    setBusy(`approve-${role}`); setMsg('')
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/interview-questions/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
      if (!res.ok) { const d = await res.json(); setMsg(d.error ?? 'Approval failed'); return }
      load()
    } finally { setBusy('') }
  }

  if (!s) return <div style={{ color: '#475569' }}>Loading…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>AI Interview Setup — {jobTitle}</h2>
        <p style={{ fontSize: 12.5, color: '#475569', margin: '4px 0 0' }}>The job description is already on file — no need to re-upload. Review and approve the questions below.</p>
      </div>

      {/* STATE: not set up */}
      {s.state === 'not_setup' && (
        <div style={card}>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>Generate an interview question set for this role from its existing job description.</div>
          <button onClick={generate} disabled={busy === 'gen'} style={btn}>{busy === 'gen' ? 'Generating…' : 'Generate questions'}</button>
        </div>
      )}

      {/* STATE: active */}
      {s.state === 'active' && (
        <div style={{ ...card, borderColor: '#A7F3D0', background: '#ECFDF5' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#065F46', marginBottom: 4 }}>✓ Question set approved</div>
          <div style={{ fontSize: 13, color: '#047857', marginBottom: 14 }}>AI interviews can now be triggered for candidates in this job.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onGoToCandidates && <button onClick={onGoToCandidates} style={btn}>Trigger for candidates →</button>}
            <button onClick={() => setS({ ...s, state: 'pending_approval' })} style={ghost}>Review / edit questions</button>
          </div>
        </div>
      )}

      {/* STATE: pending approval (the QUESTIONS step) — also reachable from active via "Review/edit" */}
      {s.state === 'pending_approval' && (
        <>
          {SECTIONS.map(({ key, label, hint }) => (
            <div key={key} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{label} <span style={{ fontWeight: 500, color: '#475569' }}>· {hint}</span></div>
                <button onClick={() => add(key)} style={{ ...ghost, marginLeft: 'auto' }}>+ Add</button>
              </div>
              {qs[key].length === 0 ? <div style={{ fontSize: 12.5, color: '#64748B' }}>No questions in this section.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {qs[key].map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <textarea value={q} onChange={(e) => edit(key, i, e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, minHeight: 38, resize: 'vertical', fontFamily: 'inherit' }} />
                      <button onClick={() => remove(key, i)} style={{ ...ghost, color: '#DC2626', padding: '8px 10px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ fontSize: 11, color: '#475569' }}>Dynamic follow-ups are handled live by the AI interviewer during the session.</div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Approvals</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#475569' }}>Mode:</span>
                {(['single', 'dual'] as const).map((m) => <button key={m} onClick={() => setMode(m)} style={{ ...ghost, padding: '5px 10px', borderColor: s.approvalMode === m ? '#6D28D9' : '#E2E8F0', color: s.approvalMode === m ? '#6D28D9' : '#64748B' }}>{m === 'single' ? 'Single approver' : 'Tech lead + HR'}</button>)}
              </div>
            </div>

            {s.approvalMode === 'single' ? (
              <button onClick={() => approve('tech_lead')} disabled={!!busy} style={btn}>{busy.startsWith('approve') ? 'Approving…' : 'Approve & activate'}</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ApprovalRow label="Tech lead approval" done={s.techLeadApproved} onApprove={() => approve('tech_lead')} busy={busy === 'approve-tech_lead'} />
                <ApprovalRow label="HR approval" done={s.hrApproved} onApprove={() => approve('hr')} busy={busy === 'approve-hr'} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={saveEdits} disabled={busy === 'save'} style={ghost}>{busy === 'save' ? 'Saving…' : 'Save edits'}</button>
            {msg && <span style={{ fontSize: 12.5, color: msg === 'Saved.' ? '#10B981' : '#DC2626' }}>{msg}</span>}
            <button onClick={generate} disabled={busy === 'gen'} style={{ ...ghost, marginLeft: 'auto' }}>{busy === 'gen' ? 'Regenerating…' : 'Regenerate'}</button>
          </div>
        </>
      )}
    </div>
  )
}

function ApprovalRow({ label, done, onApprove, busy }: { label: string; done: boolean; onApprove: () => void; busy: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <span style={{ fontSize: 15 }}>{done ? '☑' : '☐'}</span>
      <span style={{ fontSize: 13, color: '#334155', fontWeight: done ? 700 : 500 }}>{label}{done ? ' — approved' : ''}</span>
      {!done && <button onClick={onApprove} disabled={busy} style={{ marginLeft: 'auto', ...btn, padding: '7px 14px' }}>{busy ? '…' : 'Approve'}</button>}
    </div>
  )
}
