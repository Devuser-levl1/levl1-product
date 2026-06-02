'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface JDData {
  positionTitle: string
  company: string
  department?: string
  experienceLevel: string
  jdText: string
  agencyName: string
}

export default function JDApprovalPage() {
  const params = useParams()
  const token  = params.token as string

  const [data,       setData]       = useState<JDData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [alreadyDone,setAlreadyDone]= useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [comments,   setComments]   = useState('')

  useEffect(() => {
    fetch(`/api/approve/jd/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.alreadyDone) { setAlreadyDone(true); return }
        if (d.error)       { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError('Failed to load JD review'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(decision: 'approved' | 'changes_requested') {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/approve/jd/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comments }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSubmitted(true)
      toast.success(decision === 'approved' ? 'JD approved!' : 'Feedback sent to recruiter')
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

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>· JD Review</span>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* Position info */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#4F46E5', margin: '0 0 6px' }}>
            Job Description Review
          </h1>
          <p style={{ fontSize: 15, color: '#475569', margin: '0 0 4px', fontWeight: 600 }}>
            {data.positionTitle} · {data.company}
          </p>
          {data.department && <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{data.department}</p>}
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Shared by <strong>{data.agencyName}</strong>
          </p>
        </div>

        {/* JD text */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '28px 32px', marginBottom: 24, lineHeight: 1.8, fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>
          {data.jdText}
        </div>

        {/* Comments */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
            Comments / change requests (optional)
          </label>
          <textarea value={comments} onChange={e => setComments(e.target.value)}
            placeholder="If you&apos;d like any changes to the JD before interviews begin, note them here…"
            style={{ width: '100%', minHeight: 100, padding: '10px 14px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box', background: '#F8FAFC' }} />
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
            {submitting ? 'Submitting…' : 'Approve JD →'}
          </button>
        </div>
      </div>
    </div>
  )
}
