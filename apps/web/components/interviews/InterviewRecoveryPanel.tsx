'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, Send, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { Alert, Badge, Button, Field, LoadingBlock, Textarea, type Tone } from '@/components/screen/ui'

// ── Link & recovery (recruiter) ────────────────────────────────────────────
// For one candidate's interview: current state, the candidate's live link,
// "Resend invite link", "Approve retake" after a technical failure, every
// earlier attempt (kept, never overwritten) and the audit trail.

interface Attempt {
  attempt: number; status: string; startedAt: string | null; endedAt: string | null; terminationReason: string | null
  failureReason: string | null; supersededAt: string; supersededBy: string; retakeMode: string; retakeReason: string | null
  report: { overallScore: number | null; recommendation: string | null } | null
  integrity: { totalEvents: number; totalFlags: number; reviewStatus: string }; transcriptPurged: boolean
}
interface Recovery {
  state: string; stateLabel: string; attempt: number; scheduledAt: string | null
  policy: 'admin' | 'recruiter' | 'self'; canResend: boolean; canRetake: boolean; canApproveRetake: boolean; retakeApprover: string
  links: { schedulingUrl: string; joinUrl: string }
  reschedules: { used: number; max: number }
  currentIntegrity: { totalEvents: number; totalFlags: number; reviewStatus: string }
  attempts: Attempt[]
  audit: { action: string; actor: string; detail: Record<string, unknown> | null; createdAt: string }[]
}
interface AttemptDetail { transcript: { speaker: string; text: string }[]; transcriptPurged: boolean }

const STATE_TONE: Record<string, Tone> = { not_started: 'neutral', live: 'brand', interrupted: 'warning', terminated: 'warning', withdrawn: 'danger', completed: 'success', cancelled: 'neutral' }
const ACTION_LABEL: Record<string, string> = {
  link_resent: 'Invite link re-sent', retake_approved: 'Retake approved', retake_self: 'Candidate restarted (self-serve)',
  rescheduled: 'Candidate rescheduled', cancelled: 'Candidate cancelled', interrupted_reported: 'Candidate reported an interruption',
}
const ATTEMPT_STATUS: Record<string, string> = { abandoned: 'interrupted (connection lost)', interrupted: 'interrupted', terminated: 'ended early by the candidate', completed: 'completed' }
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

export function InterviewRecoveryPanel({ interviewId, candidateName, onChanged }: { interviewId: string; candidateName: string; onChanged?: () => void }) {
  const [r, setR] = useState<Recovery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'resend' | 'retake' | null>(null)
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [detail, setDetail] = useState<Record<number, AttemptDetail>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/interviews/${interviewId}/recovery`, { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'failed')
      setR(d); setError(null)
    } catch { setError('Couldn\'t load this interview\'s status. Refresh to try again.') }
  }, [interviewId])
  useEffect(() => { void load() }, [load])

  async function resend() {
    setBusy('resend')
    try {
      const res = await fetch(`/api/interviews/${interviewId}/resend-link`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Couldn\'t resend the link.')
      const ch = [d.sent?.email === 'sent' && 'email', d.sent?.whatsapp === 'sent' && 'WhatsApp'].filter(Boolean).join(' and ')
      toast.success(ch ? `New link sent to ${candidateName} by ${ch}` : 'New link created. Copy it below to share it.')
      await load(); onChanged?.()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t resend the link.') } finally { setBusy(null) }
  }

  async function retake() {
    setBusy('retake')
    try {
      const res = await fetch(`/api/interviews/${interviewId}/retake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Couldn\'t issue the retake.')
      toast.success(`Retake issued. ${candidateName} has a fresh link; attempt ${d.previous?.previousAttempt ?? ''} is kept for review.`)
      setReason(''); await load(); onChanged?.()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t issue the retake.') } finally { setBusy(null) }
  }

  async function toggle(n: number) {
    if (open === n) { setOpen(null); return }
    setOpen(n)
    if (!detail[n]) {
      const res = await fetch(`/api/interviews/${interviewId}/recovery?attempt=${n}`, { cache: 'no-store' }).catch(() => null)
      const d = res && res.ok ? await res.json() : null
      if (d?.detail) setDetail((x) => ({ ...x, [n]: d.detail }))
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>
  if (!r) return <LoadingBlock label="Loading…" />

  const copy = (u: string) => { void navigator.clipboard?.writeText(u).then(() => toast.success('Link copied')).catch(() => {}) }
  const interrupted = r.canRetake

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone={STATE_TONE[r.state] ?? 'neutral'} dot>{r.stateLabel}</Badge>
        <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>Attempt {r.attempt}{r.attempts.length ? ` (${r.attempts.length} earlier, kept below)` : ''}</span>
        {r.scheduledAt && r.state === 'not_started' && <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>· booked for {when(r.scheduledAt)}</span>}
        <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>· reschedules used {r.reschedules.used} of {r.reschedules.max}</span>
      </div>

      {/* Technical failure → retake */}
      {interrupted && (
        <Alert tone="warning" title={r.state === 'terminated' ? 'The candidate ended the interview early' : 'This interview didn\'t finish'}>
          A retake starts a fresh attempt that is the one scored. This attempt stays on record with its transcript and integrity events; nothing is deleted and the candidate isn&apos;t penalised for it.
          {r.attempts.length > 0 && ' This candidate has already had a retake.'}
        </Alert>
      )}
      {interrupted && (
        r.canApproveRetake ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <Field label="Reason for the retake" hint="Kept with the record, e.g. 'Candidate's network dropped at question 3'.">
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            </Field>
            <div><Button leftIcon={<RotateCcw size={14} />} onClick={retake} loading={busy === 'retake'} disabled={reason.trim().length < 3}>Approve retake</Button></div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Retakes are approved by {r.retakeApprover}. Ask one of them to open this panel.</p>
        )
      )}

      {/* Link */}
      <section style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Candidate link</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
          <code style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, padding: '6px 8px', background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 6 }}>{r.links.schedulingUrl}</code>
          <Button variant="secondary" size="sm" leftIcon={<Copy size={14} />} onClick={() => copy(r.links.schedulingUrl)}>Copy</Button>
        </div>
        {r.canResend && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" leftIcon={<Send size={14} />} onClick={resend} loading={busy === 'resend'}>Resend invite link</Button>
            <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Same interview, new link by email and WhatsApp. Older links stop working; consent already given isn&apos;t asked again.</span>
          </div>
        )}
      </section>

      {/* Attempt history */}
      {r.attempts.length > 0 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Earlier attempts (for review)</div>
          {r.attempts.map((a) => (
            <div key={a.attempt} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--lv-text-body)', display: 'grid', gap: 4 }}>
              <button type="button" onClick={() => toggle(a.attempt)} aria-expanded={open === a.attempt}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--lv-text)' }}>
                {open === a.attempt ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Attempt {a.attempt} · {ATTEMPT_STATUS[a.status] ?? a.status}
              </button>
              <div>Started {when(a.startedAt)} · ended {when(a.endedAt)}{a.report?.overallScore != null ? ` · report at the time: ${a.report.overallScore} (${a.report.recommendation})` : ''}</div>
              {a.failureReason && <div>What happened: {a.failureReason}</div>}
              <div>Integrity: {a.integrity.totalEvents} events, {a.integrity.totalFlags} flags ({a.integrity.reviewStatus}) — review only, not scored</div>
              <div style={{ color: 'var(--lv-text-muted)' }}>Retake {a.retakeMode === 'self' ? 'started by the candidate' : `approved by ${a.supersededBy}`} on {when(a.supersededAt)}{a.retakeReason ? ` — "${a.retakeReason}"` : ''}</div>
              {open === a.attempt && (
                <div style={{ marginTop: 6, maxHeight: 260, overflow: 'auto', background: 'var(--lv-surface-sunken)', borderRadius: 6, padding: 10, display: 'grid', gap: 6 }}>
                  {!detail[a.attempt] ? 'Loading…' : detail[a.attempt].transcriptPurged ? 'Transcript removed under the retention policy.' : detail[a.attempt].transcript.length === 0 ? 'No transcript was captured.' :
                    detail[a.attempt].transcript.map((l, i) => <div key={i}><strong>{l.speaker === 'ai' ? 'Interviewer' : 'Candidate'}:</strong> {l.text}</div>)}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Audit */}
      {r.audit.length > 0 && (
        <section style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>History</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4, fontSize: 12, color: 'var(--lv-text-muted)' }}>
            {r.audit.map((e, i) => {
              const d = e.detail ?? {}
              const extra = e.action === 'rescheduled' && d.to ? ` to ${when(String(d.to))}` : e.action === 'interrupted_reported' && d.reason ? `: ${String(d.reason)}` : e.action === 'retake_approved' && d.reason ? `: "${String(d.reason)}"` : ''
              return <li key={i}>{when(e.createdAt)} · {ACTION_LABEL[e.action] ?? e.action}{extra} · {e.actor}</li>
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
