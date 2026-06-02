'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface RubricData {
  positionTitle: string
  company: string
  department?: string
  l2ScoreThreshold: number
  scoringRubric: { technical: number; problemSolving: number; behavioral: number; eq: number }
  agencyName: string
}

function RubricRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ flex: 1, fontSize: 14, color: '#475569', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 120, height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3 }} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color, minWidth: 44 }}>{value}%</div>
      </div>
    </div>
  )
}

export default function RubricApprovalPage() {
  const params = useParams()
  const token  = params.token as string

  const [data,        setData]        = useState<RubricData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [comments,    setComments]    = useState('')

  useEffect(() => {
    fetch(`/api/approve/rubric/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.alreadyDone) { setAlreadyDone(true); return }
        if (d.error)       { setError(d.error);     return }
        setData(d)
      })
      .catch(() => setError('Failed to load rubric review'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(decision: 'approved' | 'changes_requested') {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/approve/rubric/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ decision, comments }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSubmitted(true)
      toast.success(decision === 'approved' ? 'Scoring rubric approved!' : 'Feedback sent to recruiter')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (error || alreadyDone || submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        {error ? (
          <><AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Unable to load</h2>
          <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6 }}>{error}</p></>
        ) : (
          <><CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            {submitted ? 'Thank you!' : 'Already submitted'}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 14 }}>
            {submitted ? 'Your review has been submitted. The recruiter will be notified.' : 'Your review has already been recorded.'}
          </p></>
        )}
      </div>
    </div>
  )

  if (!data) return null

  const r = data.scoringRubric

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>· Scoring Rubric Review</span>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* Position info */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#4F46E5', margin: '0 0 6px' }}>
            Scoring Rubric Approval
          </h1>
          <p style={{ fontSize: 15, color: '#475569', margin: '0 0 4px', fontWeight: 600 }}>
            {data.positionTitle} · {data.company}
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Shared by <strong>{data.agencyName}</strong>
          </p>
        </div>

        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
          Please review and approve the proposed scoring criteria for AI-powered interviews for this position.
          These weights determine how candidates are evaluated and ranked.
        </p>

        {/* Rubric breakdown */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
            Scoring Breakdown
          </h3>
          <RubricRow label="Technical Depth"   value={r.technical}     color="#4F46E5" />
          <RubricRow label="Problem Solving"   value={r.problemSolving} color="#7C3AED" />
          <RubricRow label="Behavioral / STAR" value={r.behavioral}    color="#10B981" />
          <RubricRow label="EQ & Soft Skills"  value={r.eq}            color="#F59E0B" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: '#10B981' }}>100%</span>
          </div>
        </div>

        {/* L2 threshold */}
        <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>L2 Submission Threshold</div>
          <div style={{ fontSize: 14, color: '#047857', lineHeight: 1.6 }}>
            Candidates scoring <strong>{data.l2ScoreThreshold}+</strong> out of 100 will be recommended for Level 2 interviews.
            All others will be marked as below threshold.
          </div>
        </div>

        {/* Comments */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
            Comments / change requests (optional)
          </label>
          <textarea value={comments} onChange={e => setComments(e.target.value)}
            placeholder="If you&apos;d like the weightings adjusted, note your preferred breakdown here…"
            style={{ width: '100%', minHeight: 88, padding: '10px 14px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box', background: '#F8FAFC' }} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => handleSubmit('changes_requested')} disabled={submitting}
            style={{ padding: '12px 24px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}>
            Request Changes
          </button>
          <button onClick={() => handleSubmit('approved')} disabled={submitting}
            style={{ flex: 1, background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: submitting ? 'none' : '0 4px 12px rgba(16,185,129,0.30)', fontFamily: 'var(--font-sans)' }}>
            <CheckCircle2 size={16} />
            {submitting ? 'Submitting…' : 'Approve Rubric →'}
          </button>
        </div>
      </div>
    </div>
  )
}
