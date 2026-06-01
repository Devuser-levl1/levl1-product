'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Zap, Clock, Mail } from 'lucide-react'

export default function InterviewCompletePage() {
  const params    = useParams()
  const token     = params?.token as string
  const [name, setName] = useState<string | null>(null)

  /* Try to read the candidate's first name from the token validation response */
  useEffect(() => {
    if (!token) return
    fetch(`/api/interview-token?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.interview?.candidateName) {
          setName(data.interview.candidateName.split(' ')[0])
        }
      })
      .catch(() => {})
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0FFF4 0%, #F0EBFF 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', fontFamily: 'var(--font-sans)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>Levl1</span>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', border: '1px solid #D1FAE5', borderRadius: 20,
        padding: '48px 44px', width: '100%', maxWidth: 460, textAlign: 'center',
        boxShadow: '0 8px 32px rgba(16,185,129,0.10)',
      }}>
        {/* Success icon */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(16,185,129,0.10)', border: '2px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={36} color="#10B981" />
          </div>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
          color: '#1E293B', marginBottom: 12, letterSpacing: '-0.02em',
        }}>
          {name ? `Well done, ${name}!` : 'Interview Complete!'}
        </h1>
        <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.75, marginBottom: 32 }}>
          Thank you for completing your interview. Your responses have been recorded and will be reviewed by the hiring team.
        </p>

        {/* What happens next */}
        <div style={{
          background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '20px 24px', textAlign: 'left', marginBottom: 28,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            What happens next
          </p>
          {[
            { icon: <CheckCircle2 size={14} color="#10B981" />, text: 'Your interview has been submitted' },
            { icon: <Clock size={14} color="#7C3AED" />,        text: 'The team will review your evaluation within 2–3 business days' },
            { icon: <Mail size={14} color="#4F46E5" />,         text: "You'll hear back via email with next steps" },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>{item.icon}</div>
              <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
          You can close this window. This link has now been marked as complete.
        </p>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: '#CBD5E1' }}>
        Powered by Levl1 · AI Interviewing Platform
      </p>
    </div>
  )
}
