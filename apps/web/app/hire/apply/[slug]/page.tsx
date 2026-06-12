'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface JobView { title: string; description: string; location: string | null; department: string | null; salaryMin: number | null; salaryMax: number | null; company: string; logoUrl: string | null }

const lakh = (n: number) => `₹${(n / 100000).toFixed(0)}L`
const inp: React.CSSProperties = { padding: '11px 13px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }

export default function ApplyPage() {
  const params = useParams()
  const slug = String(params?.slug ?? '')
  const [job, setJob] = useState<JobView | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', currentRole: '', linkedin: '', resumeText: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch(`/api/hire/apply/${slug}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && !d.error) setJob(d); else setNotFound(true) }).catch(() => setNotFound(true))
  }, [slug])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const res = await fetch(`/api/hire/apply/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Submission failed'); setSubmitting(false); return }
      setDone(true)
    } catch { setError('Something went wrong'); setSubmitting(false) }
  }

  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', padding: '32px 16px' }
  if (notFound) return <div style={wrap}><div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', color: '#64748B' }}>This job is no longer accepting applications.</div></div>
  if (!job) return <div style={wrap}><div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', color: '#94A3B8' }}>Loading…</div></div>

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32 }}>
        {job.logoUrl ? <img src={job.logoUrl} alt={job.company} height={36} style={{ objectFit: 'contain', marginBottom: 16 }} /> : null}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{job.title}</h1>
        <div style={{ color: '#64748B', fontSize: 14 }}>{job.company}{job.location ? ` · ${job.location}` : ''}</div>
        {(job.salaryMin || job.salaryMax) ? <div style={{ color: '#4F46E5', fontSize: 14, fontWeight: 600, marginTop: 4 }}>{job.salaryMin ? lakh(job.salaryMin) : '–'} – {job.salaryMax ? lakh(job.salaryMax) : '–'} per year</div> : null}

        <div style={{ whiteSpace: 'pre-wrap', color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '20px 0', paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>{job.description}</div>

        {done ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: 20, textAlign: 'center', color: '#065F46', fontWeight: 600 }}>
            Thank you! Your application has been submitted.
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>Apply for this role</div>
            <input style={inp} placeholder="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <input style={inp} type="email" placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <input style={inp} placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <input style={inp} placeholder="Current role (optional)" value={form.currentRole} onChange={(e) => set('currentRole', e.target.value)} />
            <input style={inp} placeholder="LinkedIn URL (optional)" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
            <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }} placeholder="Paste your resume text here" value={form.resumeText} onChange={(e) => set('resumeText', e.target.value)} />
            {error && <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>}
            <button type="submit" disabled={submitting} style={{ padding: '13px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'default' : 'pointer' }}>{submitting ? 'Submitting…' : 'Submit Application'}</button>
          </form>
        )}
        <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 20 }}>Powered by Levl1 Hire</div>
      </div>
    </div>
  )
}
