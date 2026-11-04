'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Play } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { Candidate, Position, Interview } from '@/store/appStore'
import { Modal, ActionBar, Button, Eyebrow } from '@/components/screen/ui'
import { lv, space, text, radius } from '@/lib/screen/ui/tokens'

// Design-System Pass 3 (group 4): rendered on the canonical Modal. Preflight,
// usage check and interview creation are unchanged.

interface Props {
  candidate: Candidate
  position: Position | undefined
  onClose: () => void
}

interface PreflightResult {
  positionApproved: { ok: boolean; reason?: string }
  questionsReady: { ok: boolean; count: number; reason?: string }
  candidateInvited: { ok: boolean; status: string; reason?: string }
  elevenLabsConfigured: { ok: boolean; reason?: string }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: space[3] }}>
      <dt style={{ fontSize: text.xs, fontWeight: 600, color: lv.textMuted, minWidth: 72, flexShrink: 0 }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: text.sm, fontWeight: 600, color: lv.text }}>{value}</dd>
    </div>
  )
}

export default function StartInterviewModal({ candidate, position, onClose }: Props) {
  const router = useRouter()
  const { interviews, addInterview, updateCandidate, setShowUpgradeWall } = useAppStore()

  /* ── ElevenLabs status (fetched server-side so the key stays secret) ── */
  const [elevenLabsOk, setElevenLabsOk] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/check-status')
      .then((r) => r.json())
      .then((data) => setElevenLabsOk(!!data.elevenLabsConfigured))
      .catch(() => setElevenLabsOk(false))
  }, [])

  /* ── Preflight checks from DB ─────────────────────────────────── */
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)

  useEffect(() => {
    if (!candidate?.id || !candidate?.positionId) return
    fetch(`/api/preflight?candidateId=${candidate.id}&positionId=${candidate.positionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPreflight(data) })
      .catch(() => {})
  }, [candidate?.id, candidate?.positionId])

  /* ── Local fallback resolveInterviewId ─────────────────────────── */
  function resolveInterviewIdLocal(): string {
    if (candidate.interviewId) return candidate.interviewId

    const existing = interviews.find((iv) => iv.candidateId === candidate.id)
    if (existing) {
      updateCandidate(candidate.id, { interviewId: existing.id })
      return existing.id
    }

    const newId = `iv-${Date.now()}`
    const newInterview: Interview = {
      id: newId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      positionId: candidate.positionId,
      positionTitle: candidate.positionTitle,
      scheduledAt: candidate.scheduledAt ?? new Date().toISOString(),
      duration: position?.interviewDuration ?? 30,
      status: 'scheduled',
      agentOnline: true,
      candidateJoined: false,
    }
    addInterview(newInterview)
    updateCandidate(candidate.id, { interviewId: newId })
    return newId
  }

  async function handleBegin() {
    // Usage check
    try {
      const usageRes = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      })
      if (usageRes.ok) {
        const usage = await usageRes.json()
        if (!usage.allowed) { onClose(); setShowUpgradeWall(true); return }
      }
    } catch { /* proceed anyway */ }

    // Create real Interview record in DB if needed
    let interviewId: string

    try {
      // Try to find existing interview for this candidate
      const existingRes = await fetch(`/api/interviews?candidateId=${candidate.id}`)
      if (existingRes.ok) {
        const existing = await existingRes.json()
        if (Array.isArray(existing) && existing.length > 0) {
          interviewId = existing[0].id
        } else {
          throw new Error('need to create')
        }
      } else {
        throw new Error('need to create')
      }
    } catch {
      // Create new Interview in DB
      const createRes = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          positionId: candidate.positionId,
          status: 'scheduled',
          duration: position?.interviewDuration ?? 30,
        }),
      })
      if (createRes.ok) {
        const created = await createRes.json()
        interviewId = created.id
      } else {
        // Fallback to local store approach
        interviewId = resolveInterviewIdLocal()
      }
    }

    // Update candidate interviewId in store
    updateCandidate(candidate.id, { interviewId })

    onClose()
    router.push(`/interview/${interviewId}`)
  }

  /* ── Pre-flight checks ────────────────────────────────────────── */
  type Check = { label: string; ok: boolean; sub?: string; loading?: boolean }

  const checks: Check[] = preflight ? [
    {
      label: preflight.positionApproved.ok ? 'Position approved' : (preflight.positionApproved.reason ?? 'Position not fully approved'),
      ok: preflight.positionApproved.ok,
    },
    {
      label: preflight.questionsReady.ok
        ? `Questions ready (${preflight.questionsReady.count} questions)`
        : (preflight.questionsReady.reason ?? 'Questions not ready'),
      ok: preflight.questionsReady.ok,
    },
    {
      label: preflight.candidateInvited.ok ? 'Candidate invited' : (preflight.candidateInvited.reason ?? 'Candidate not invited'),
      ok: preflight.candidateInvited.ok,
    },
    {
      label: elevenLabsOk === null ? 'Checking ElevenLabs…'
        : elevenLabsOk ? 'ElevenLabs configured'
        : 'ElevenLabs key not configured',
      ok: !!elevenLabsOk,
      sub: elevenLabsOk ? undefined : elevenLabsOk === null ? undefined : 'Will use browser TTS as fallback',
      loading: elevenLabsOk === null,
    },
  ] : [
    // Loading state
    { label: 'Checking position approval…', ok: false, loading: true },
    { label: 'Checking question set…', ok: false, loading: true },
    { label: 'Checking candidate status…', ok: false, loading: true },
    {
      label: elevenLabsOk === null ? 'Checking ElevenLabs…' : elevenLabsOk ? 'ElevenLabs configured' : 'ElevenLabs key not configured',
      ok: !!elevenLabsOk,
      loading: elevenLabsOk === null,
    },
  ]

  const duration = position?.interviewDuration ?? 30

  return (
    <Modal open onClose={onClose} size="sm"
      title="Start Interview"
      footer={<ActionBar>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleBegin} leftIcon={<Play size={14} fill="currentColor" strokeWidth={0} />}>Begin Interview →</Button>
      </ActionBar>}>
      {/* Candidate info box */}
      <dl style={{
        background: lv.surfaceSunken, border: `1px solid ${lv.border}`, borderRadius: radius.md,
        padding: `${space[3]}px ${space[4]}px`, margin: `0 0 ${space[5]}px`,
        display: 'flex', flexDirection: 'column', gap: space[2],
      }}>
        <InfoRow label="Candidate" value={candidate.name} />
        <InfoRow label="Position"  value={candidate.positionTitle} />
        <InfoRow label="Duration"  value={`${duration} minutes`} />
      </dl>

      {/* Pre-flight checks */}
      <section aria-labelledby="sim-preflight">
        <Eyebrow style={{ marginBottom: space[3] }}><span id="sim-preflight">Pre-flight checks</span></Eyebrow>
        <ul aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: space[3], listStyle: 'none', margin: 0, padding: 0 }}>
          {checks.map((c, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: space[2] }}>
              {c.loading
                ? <span className="lv-spinner" aria-hidden="true" style={{ marginTop: 2, color: lv.textMuted, width: 15, height: 15 }} />
                : c.ok
                ? <CheckCircle2 size={16} color={lv.success} aria-hidden="true" style={{ marginTop: 1, flexShrink: 0 }} />
                : <AlertTriangle size={16} color={lv.warning} aria-hidden="true" style={{ marginTop: 1, flexShrink: 0 }} />
              }
              <div>
                <span className="lv-sr-only">{c.loading ? 'Checking: ' : c.ok ? 'Passed: ' : 'Warning: '}</span>
                <span style={{ fontSize: text.sm, color: c.loading ? lv.textMuted : c.ok ? lv.textBody : lv.warning, fontWeight: c.ok || c.loading ? 500 : 600, lineHeight: 1.4 }}>
                  {c.label}
                </span>
                {c.sub && (
                  <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 1 }}>{c.sub}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  )
}
