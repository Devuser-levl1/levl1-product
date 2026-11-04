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
      background: 'linear-gradient(135deg, var(--lv-success-soft) 0%, var(--lv-accent-soft) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', fontFamily: 'var(--lv-font-sans)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, var(--lv-brand), var(--lv-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--lv-brand)' }}>Levl1</span>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--lv-surface)', border: '1px solid var(--lv-success-border)', borderRadius: 20,
        padding: '48px 44px', width: '100%', maxWidth: 460, textAlign: 'center',
        boxShadow: '0 8px 32px color-mix(in srgb, var(--lv-success) 10%, transparent)',
      }}>
        {/* Success icon */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--lv-success) 10%, transparent)', border: '2px solid color-mix(in srgb, var(--lv-success) 25%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={36} color="var(--lv-success)" />
          </div>
        </div>

        <h1 style={{
          fontFamily: 'var(--lv-font-display)', fontSize: 28, fontWeight: 600,
          color: 'var(--lv-text)', marginBottom: 12, letterSpacing: '-0.02em',
        }}>
          {name ? `Well done, ${name}!` : 'Interview Complete!'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--lv-text-body)', lineHeight: 1.75, marginBottom: 32 }}>
          Thank you for completing your interview. Your responses have been recorded and will be reviewed by the hiring team.
        </p>

        {/* What happens next */}
        <div style={{
          background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 8,
          padding: '20px 24px', textAlign: 'left', marginBottom: 28,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            What happens next
          </p>
          {[
            { icon: <CheckCircle2 size={14} color="var(--lv-success)" />, text: 'Your interview has been submitted' },
            { icon: <Clock size={14} color="var(--lv-accent)" />,        text: 'The team will review your evaluation within 2–3 business days' },
            { icon: <Mail size={14} color="var(--lv-brand)" />,         text: "You'll hear back via email with next steps" },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>{item.icon}</div>
              <span style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', lineHeight: 1.6 }}>
          You can close this window. This link has now been marked as complete.
        </p>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--lv-border-strong)' }}>
        Powered by Levl1 · AI Interviewing Platform
      </p>
    </div>
  )
}
