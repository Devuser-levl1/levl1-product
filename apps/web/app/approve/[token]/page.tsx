'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Zap, CheckCircle2, XCircle, Edit3, Plus, Trash2, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question: string
  expectedKeyPoints?: string[]
  followUp?: string
  difficulty?: string
  techTag?: string
  estimatedMinutes?: number
  localStatus?: 'approved' | 'removed' | 'pending'
  editing?: boolean
  editedText?: string
}

interface ApprovalData {
  id: string
  type: 'tech_lead' | 'hr'
  positionTitle: string
  company: string
  department?: string
  experienceLevel: string
  techStack: string[]
  questions: {
    technical:  Question[]
    scenario:   Question[]
    whiteboard: Question[]
    behavioral: Question[]
    eq:         Question[]
  }
  questionSetId: string
}

function QuestionCard({ q, onApprove, onRemove, onEdit }: {
  q: Question
  onApprove: () => void
  onRemove:  () => void
  onEdit: (newText: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [editText, setEditText] = useState(q.question)

  const status = q.localStatus ?? 'pending'

  return (
    <div style={{
      border: `1px solid ${status === 'approved' ? 'rgba(16,185,129,0.25)' : status === 'removed' ? 'rgba(239,68,68,0.2)' : '#E2E8F0'}`,
      borderRadius: 10,
      background: status === 'approved' ? 'rgba(16,185,129,0.03)' : status === 'removed' ? 'rgba(239,68,68,0.03)' : '#fff',
      overflow: 'hidden',
      opacity: status === 'removed' ? 0.5 : 1,
    }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box' }}
                autoFocus
              />
            ) : (
              <p style={{ fontSize: 14, color: '#1E293B', margin: 0, lineHeight: 1.6 }}>{q.question}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              {q.techTag && (
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: '#F1F5F9', color: '#475569', padding: '2px 7px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
                  {q.techTag}
                </span>
              )}
              {q.difficulty && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
                  background: q.difficulty === 'advanced' ? 'rgba(239,68,68,0.08)' : q.difficulty === 'intermediate' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                  color:      q.difficulty === 'advanced' ? '#EF4444' : q.difficulty === 'intermediate' ? '#D97706' : '#10B981',
                }}>
                  {q.difficulty}
                </span>
              )}
              {q.estimatedMinutes && (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{q.estimatedMinutes} min</span>
              )}
            </div>
          </div>

          {/* Status indicator */}
          {status === 'approved' && <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />}
          {status === 'removed'  && <XCircle      size={18} color="#EF4444" style={{ flexShrink: 0 }} />}
        </div>

        {/* Expandable details */}
        {(q.expectedKeyPoints?.length || q.followUp) && (
          <button type="button" onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 12, marginTop: 8, padding: 0, fontFamily: 'var(--font-sans)' }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'View'} key points
          </button>
        )}
        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            {q.expectedKeyPoints?.length ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expected Key Points</div>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {q.expectedKeyPoints.map((kp, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#475569' }}>{kp}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {q.followUp && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Follow-up</div>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{q.followUp}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      {status !== 'removed' && (
        <div style={{ borderTop: '1px solid #F1F5F9', padding: '8px 16px', background: '#F8FAFC', display: 'flex', gap: 6 }}>
          {editing ? (
            <>
              <button onClick={() => { onEdit(editText); setEditing(false); toast.success('Question updated') }}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Save
              </button>
              <button onClick={() => { setEditText(q.question); setEditing(false) }}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={onApprove}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: `1px solid ${status === 'approved' ? 'rgba(16,185,129,0.3)' : '#E2E8F0'}`, background: status === 'approved' ? 'rgba(16,185,129,0.08)' : '#fff', color: status === 'approved' ? '#059669' : '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <CheckCircle2 size={11} /> {status === 'approved' ? 'Approved' : 'Approve'}
              </button>
              <button onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <Edit3 size={11} /> Edit
              </button>
              <button onClick={onRemove}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <Trash2 size={11} /> Remove
              </button>
            </>
          )}
        </div>
      )}
      {status === 'removed' && (
        <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', padding: '8px 16px', background: 'rgba(239,68,68,0.03)', display: 'flex', gap: 6 }}>
          <button onClick={onApprove}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Restore
          </button>
        </div>
      )}
    </div>
  )
}

function QuestionSection({ title, questions, type, onUpdate }: {
  title:    string
  questions: Question[]
  type:     string
  onUpdate: (updated: Question[]) => void
}) {
  const active = questions.filter(q => q.localStatus !== 'removed')
  const approved = active.filter(q => q.localStatus === 'approved').length

  function setStatus(id: string, status: 'approved' | 'removed' | 'pending') {
    onUpdate(questions.map(q => q.id === id ? { ...q, localStatus: status } : q))
  }
  function setEdit(id: string, text: string) {
    onUpdate(questions.map(q => q.id === id ? { ...q, question: text } : q))
  }

  if (questions.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          {title} ({active.length})
        </h3>
        <span style={{ fontSize: 12, color: approved === active.length ? '#059669' : '#94A3B8', fontWeight: 600 }}>
          {approved}/{active.length} approved
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.map(q => (
          <QuestionCard
            key={q.id + type}
            q={q}
            onApprove={() => setStatus(q.id, q.localStatus === 'approved' ? 'pending' : 'approved')}
            onRemove={()  => setStatus(q.id, 'removed')}
            onEdit={(t)   => setEdit(q.id, t)}
          />
        ))}
      </div>
    </div>
  )
}

export default function ApprovalPage() {
  const params = useParams()
  const token  = params.token as string

  const [data,       setData]       = useState<ApprovalData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [alreadyDone,setAlreadyDone]= useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [comments,   setComments]   = useState('')
  const [addingNew,  setAddingNew]  = useState(false)
  const [newQ,       setNewQ]       = useState('')

  // Local question state per section
  const [questions, setQuestions] = useState<ApprovalData['questions']>({
    technical: [], scenario: [], whiteboard: [], behavioral: [], eq: [],
  })

  useEffect(() => {
    fetch(`/api/approve/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.alreadyDone) { setAlreadyDone(true); return }
        if (d.error) { setError(d.error); return }
        setData(d)
        setQuestions(d.questions)
      })
      .catch(() => setError('Failed to load approval data'))
      .finally(() => setLoading(false))
  }, [token])

  function updateSection(key: keyof ApprovalData['questions'], updated: Question[]) {
    setQuestions(q => ({ ...q, [key]: updated }))
  }

  function addQuestion() {
    if (!newQ.trim() || !data) return
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      question: newQ.trim(),
      localStatus: 'approved',
    }
    // Determine which section to add to based on approver type
    const targetKey: keyof ApprovalData['questions'] = data.type === 'hr' ? 'behavioral' : 'technical'
    setQuestions(q => ({ ...q, [targetKey]: [...q[targetKey], newQuestion] }))
    setNewQ('')
    setAddingNew(false)
    toast.success('Question added')
  }

  async function handleSubmit(decision: 'approved' | 'changes_requested') {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/approve/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          comments,
          updatedQuestions: questions,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSubmitted(true)
      if (d.positionActivated) {
        toast.success('Position activated — all approvals complete!')
      } else {
        toast.success(decision === 'approved' ? 'Approval submitted!' : 'Changes requested — feedback sent to recruiter')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  // ── Error ──
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Unable to load review</h2>
        <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
      </div>
    </div>
  )

  // ── Already done ──
  if (alreadyDone) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Already submitted</h2>
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Your approval has already been recorded. Thank you!</p>
      </div>
    </div>
  )

  // ── Submitted ──
  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Thank you!</h2>
        <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>Your review has been submitted. The recruiter will be notified.</p>
      </div>
    </div>
  )

  if (!data) return null

  const isTech = data.type === 'tech_lead'
  const allActive = [
    ...questions.technical, ...questions.scenario, ...questions.whiteboard,
    ...questions.behavioral, ...questions.eq,
  ].filter(q => q.localStatus !== 'removed')
  const approvedCount = allActive.filter(q => q.localStatus === 'approved').length
  const totalCount    = allActive.length

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>
          · {isTech ? 'Technical Review' : 'HR Review'}
        </span>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* Position info */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px 28px', marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#4F46E5', margin: '0 0 6px' }}>
            Interview Questions Review
          </h1>
          <p style={{ fontSize: 15, color: '#475569', margin: '0 0 16px', fontWeight: 600 }}>
            {data.positionTitle} · {data.company}
          </p>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
            You have been asked to review and {isTech ? 'approve the <strong>technical, scenario, and whiteboard</strong> questions' : 'approve the <strong>behavioral and EQ</strong> questions'} for this position.
            You can approve, edit, or remove individual questions before submitting your review.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.techStack.slice(0, 6).map(t => (
              <span key={t} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 4, border: '1px solid #E2E8F0' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Questions */}
        {isTech && (
          <>
            <QuestionSection title="Technical Questions" questions={questions.technical} type="technical" onUpdate={q => updateSection('technical', q)} />
            <QuestionSection title="Scenario Questions"  questions={questions.scenario}  type="scenario"  onUpdate={q => updateSection('scenario',  q)} />
            <QuestionSection title="Whiteboard / Design" questions={questions.whiteboard}type="whiteboard"onUpdate={q => updateSection('whiteboard',q)} />
          </>
        )}
        {!isTech && (
          <>
            <QuestionSection title="Behavioral Questions" questions={questions.behavioral} type="behavioral" onUpdate={q => updateSection('behavioral', q)} />
            <QuestionSection title="EQ & Soft Skills"     questions={questions.eq}         type="eq"         onUpdate={q => updateSection('eq',         q)} />
          </>
        )}

        {/* Add question */}
        {addingNew ? (
          <div style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <textarea value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Type your new question here…" autoFocus
              style={{ width: '100%', minHeight: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addQuestion} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Add</button>
              <button onClick={() => { setAddingNew(false); setNewQ('') }} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingNew(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px dashed #C7D2FE', background: 'rgba(79,70,229,0.04)', color: '#4F46E5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', marginBottom: 28 }}>
            <Plus size={14} /> Add a question
          </button>
        )}

        {/* Comments */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Overall comments (optional)</label>
          <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Any feedback for the recruiter…"
            style={{ width: '100%', minHeight: 88, padding: '10px 14px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box', background: '#F8FAFC' }} />
        </div>

        {/* Progress & submit */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#475569' }}>
              <strong style={{ color: approvedCount === totalCount ? '#059669' : '#4F46E5' }}>{approvedCount}</strong> of {totalCount} questions approved
            </div>
            <div style={{ width: 120, height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}%`, background: '#10B981', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleSubmit('changes_requested')} disabled={submitting}
              style={{ padding: '11px 20px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}>
              Request Changes
            </button>
            <button onClick={() => handleSubmit('approved')} disabled={submitting}
              style={{ flex: 1, background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: submitting ? 'none' : '0 4px 12px rgba(16,185,129,0.30)', fontFamily: 'var(--font-sans)' }}>
              <CheckCircle2 size={16} />
              {submitting ? 'Submitting…' : 'Submit Approval →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
