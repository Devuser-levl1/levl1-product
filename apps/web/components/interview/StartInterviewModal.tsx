'use client'

import { useRouter } from 'next/navigation'
import { X, CheckCircle2, AlertTriangle, Play } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { Candidate, Position, Interview } from '@/store/appStore'

interface Props {
  candidate: Candidate
  position: Position | undefined
  onClose: () => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', minWidth: 72, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{value}</span>
    </div>
  )
}

export default function StartInterviewModal({ candidate, position, onClose }: Props) {
  const router = useRouter()
  const { interviews, addInterview, updateCandidate } = useAppStore()

  /* ── Resolve or create an interviewId ─────────────────────────── */
  function resolveInterviewId(): string {
    // 1. Already linked on candidate record
    if (candidate.interviewId) return candidate.interviewId

    // 2. Look for an existing Interview record for this candidate
    const existing = interviews.find((iv) => iv.candidateId === candidate.id)
    if (existing) {
      // Cache it on the candidate so we don't re-search
      updateCandidate(candidate.id, { interviewId: existing.id })
      return existing.id
    }

    // 3. Create a new one on the fly
    const newId = `iv-${Date.now()}`
    const newInterview: Interview = {
      id: newId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      positionId: candidate.positionId,
      positionTitle: candidate.positionTitle,
      scheduledAt: candidate.scheduledAt ?? new Date().toISOString(),
      duration: position?.interviewDuration ?? 45,
      status: 'scheduled',
      agentOnline: true,
      candidateJoined: false,
    }
    addInterview(newInterview)
    updateCandidate(candidate.id, { interviewId: newId })
    return newId
  }

  function handleBegin() {
    const id = resolveInterviewId()
    onClose()
    router.push(`/interview/${id}`)
  }

  /* ── Pre-flight checks ────────────────────────────────────────── */
  type Check = { label: string; ok: boolean; sub?: string }

  const positionApproved = !!(position?.approvals?.techLead && position?.approvals?.hr)
  const candidateInvited = !!(candidate.invitedAt || candidate.status === 'scheduled')

  const checks: Check[] = [
    {
      label: positionApproved ? 'Position approved' : 'Position not fully approved',
      ok: positionApproved,
    },
    {
      label: 'Questions ready (12 questions)',
      ok: !!position,
    },
    {
      label: candidateInvited ? 'Candidate invited' : 'Candidate has not been invited',
      ok: candidateInvited,
    },
    {
      label: 'ElevenLabs key not configured',
      ok: false,
      sub: 'Will use browser TTS as fallback',
    },
  ]

  const duration = position?.interviewDuration ?? 45

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,10,46,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, width: 460,
          boxShadow: '0 32px 80px rgba(79,70,229,0.18), 0 8px 24px rgba(0,0,0,0.08)',
          overflow: 'hidden', border: '1px solid #E2E8F0',
          animation: 'fadeUp 0.18s ease both',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Play size={13} color="white" fill="white" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800,
              color: '#1E293B', margin: 0, letterSpacing: '-0.01em',
            }}>
              Start Interview
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94A3B8', padding: 6, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8' }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px' }}>

          {/* Candidate info box */}
          <div style={{
            background: '#F8FAFF', border: '1px solid #EEF2FF', borderRadius: 12,
            padding: '14px 18px', marginBottom: 22,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <InfoRow label="Candidate" value={candidate.name} />
            <InfoRow label="Position"  value={candidate.positionTitle} />
            <InfoRow label="Duration"  value={`${duration} minutes`} />
          </div>

          {/* Pre-flight checks */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            }}>
              Pre-flight checks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {checks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {c.ok
                    ? <CheckCircle2 size={15} color="#10B981" style={{ marginTop: 1.5, flexShrink: 0 }} />
                    : <AlertTriangle size={15} color="#F59E0B" style={{ marginTop: 1.5, flexShrink: 0 }} />
                  }
                  <div>
                    <span style={{ fontSize: 13, color: c.ok ? '#334155' : '#92400E', fontWeight: 500, lineHeight: 1.4 }}>
                      {c.label}
                    </span>
                    {c.sub && (
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{c.sub}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9,
              color: '#475569', fontSize: 13, fontWeight: 600,
              padding: '9px 18px', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFF' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff' }}
          >
            Cancel
          </button>

          <button
            onClick={handleBegin}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              border: 'none', borderRadius: 9, color: '#fff',
              fontSize: 14, fontWeight: 700, padding: '9px 22px',
              cursor: 'pointer', letterSpacing: '-0.01em',
              boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.35)'; e.currentTarget.style.transform = 'none' }}
          >
            <Play size={14} fill="white" strokeWidth={0} />
            Begin Interview →
          </button>
        </div>
      </div>
    </div>
  )
}
