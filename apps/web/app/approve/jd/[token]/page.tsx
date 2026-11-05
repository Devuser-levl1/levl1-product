'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ScreenLogo } from '@/components/screen/brand/ScreenLogo'

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
      .catch(() => setError('Couldn\'t load the JD review. Please refresh the page.'))
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (error || alreadyDone || submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        {error ? (
          <><AlertCircle size={48} color="var(--lv-danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>Unable to load</h2>
          <p style={{ color: 'var(--lv-text-muted)', fontSize: 14, lineHeight: 1.6 }}>{error}</p></>
        ) : (
          <><CheckCircle2 size={48} color="var(--lv-success)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>
            {submitted ? 'Thank you!' : 'Already submitted'}
          </h2>
          <p style={{ color: 'var(--lv-text-muted)', fontSize: 14 }}>
            {submitted ? 'Your review has been submitted. The recruiter will be notified.' : 'Your review has already been recorded.'}
          </p></>
        )}
      </div>
    </div>
  )

  if (!data) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header style={{ background: 'var(--lv-surface)', borderBottom: '1px solid var(--lv-border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ScreenLogo height={30} tone="auto" />
        <span style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginLeft: 4 }}>· JD Review</span>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* Position info */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 6px' }}>
            Job Description Review
          </h1>
          <p style={{ fontSize: 16, color: 'var(--lv-text-body)', margin: '0 0 4px', fontWeight: 600 }}>
            {data.positionTitle} · {data.company}
          </p>
          {data.department && <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>{data.department}</p>}
          <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 4 }}>
            Shared by <strong>{data.agencyName}</strong>
          </p>
        </div>

        {/* JD text */}
        <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '28px 32px', marginBottom: 24, lineHeight: 1.8, fontSize: 14, color: 'var(--lv-text-body)', whiteSpace: 'pre-wrap' }}>
          {data.jdText}
        </div>

        {/* Comments */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--lv-text-body)', marginBottom: 8 }}>
            Comments / change requests (optional)
          </label>
          <textarea value={comments} onChange={e => setComments(e.target.value)}
            placeholder="If you&apos;d like any changes to the JD before interviews begin, note them here…"
            style={{ width: '100%', minHeight: 100, padding: '10px 14px', borderRadius: 6, border: '1px solid var(--lv-border)', fontSize: 14, fontFamily: 'var(--font-sans)', resize: 'vertical', boxSizing: 'border-box', background: 'var(--lv-surface-sunken)' }} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => handleSubmit('changes_requested')} disabled={submitting}
            style={{ padding: '12px 24px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface-sunken)', color: 'var(--lv-text-muted)', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)' }}>
            Request Changes
          </button>
          <button onClick={() => handleSubmit('approved')} disabled={submitting}
            style={{ flex: 1, background: submitting ? 'var(--lv-text-muted)' : 'var(--lv-gradient-brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 24px', fontSize: 16, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: submitting ? 'none' : '0 4px 12px color-mix(in srgb, var(--lv-success) 30%, transparent)', fontFamily: 'var(--font-sans)' }}>
            <CheckCircle2 size={16} />
            {submitting ? 'Submitting…' : 'Approve JD →'}
          </button>
        </div>
      </div>
    </div>
  )
}
