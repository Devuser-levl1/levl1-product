'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Clock, CalendarClock, MessageSquareText, ShieldCheck } from 'lucide-react'
import { Button, Alert, LoadingBlock } from '@/components/screen/ui'
import { CandidateShell } from '@/components/screen/candidate/CandidateShell'
import { ConsentCheckbox } from '@/components/interviews/ConsentCheckbox'
import { SolveNotice } from '@/components/solve/SolveNotice'
import { SolveWorkspace, type AiExchangeView } from '@/components/solve/SolveWorkspace'
import { SolveDefense } from '@/components/solve/SolveDefense'
import type { PublicTask } from '@/lib/screen/workspace/task'
import { PRODUCTS } from '@/config/site'

// ── Solve: candidate take-home page (token link, no login) ─────────────────

interface View {
  status: 'invited' | 'started' | 'submitted' | 'completed' | 'expired'
  candidateFirstName: string; positionTitle: string; company: string; orgName: string
  config: { durationMinutes: number; defenseRequired: boolean; defenseTiming: 'immediate' | 'flexible'; aiPolicy: 'allowed' | 'not_allowed'; integrityLevel: string }
  taskTitle: string
  expiresAt: string; startedAt: string | null; deadlineAt: string | null; submittedAt: string | null; autoSubmitted: boolean; quality: string | null
  consentGiven: boolean
  notice: { version: string; retentionDays: number }
  executionAvailable: boolean
  task: PublicTask | null
  saved: { code: string; language: string; savedAt: string } | null
  resumeMs: number; executionsLeft: number
  ai: { enabled: boolean; remaining: number; exchanges: AiExchangeView[] }
  defense: { status: string; deadlineAt: string | null; turns: { speaker: 'ai' | 'candidate'; text: string }[]; voiceAccent: string | null }
}

const BRAND = '#4F46E5'
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function SolvePage() {
  const { token } = useParams<{ token: string }>()
  const [v, setV] = useState<View | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/solve/t/${token}`, { cache: 'no-store' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error ?? 'This link is not valid.'); return }
      setV(d as View)
    } catch { setError('We couldn\'t load your take-home. Check your connection and refresh.') }
  }, [token])
  useEffect(() => { void load() }, [load])

  const act = async (action: string) => {
    setBusy(true); setError(null)
    try {
      const r = await fetch(`/api/solve/t/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Something went wrong. Please try again.')
      return d
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); return null } finally { setBusy(false) }
  }

  const start = async () => {
    if (!v) return
    if (!v.consentGiven && !(await act('consent'))) return
    const d = await act('start')
    if (d) setV(d as View)
  }

  if (!v) {
    return (
      <CandidateShell brand={BRAND} agencyName="Take-home assessment" logo={null}>
        {error ? <Alert tone="danger" title="We couldn't open this take-home">{error}</Alert> : <LoadingBlock label="Loading your take-home…" />}
      </CandidateShell>
    )
  }

  // Working: full-screen editor.
  if (v.status === 'started' && v.task) {
    return (
      <SolveWorkspace token={token} task={v.task} saved={v.saved} resumeMs={v.resumeMs} deadlineAt={v.deadlineAt}
        executionAvailable={v.executionAvailable} executionsLeft={v.executionsLeft} ai={v.ai} onSubmitted={(d) => setV(d as View)} />
    )
  }

  const title = `${v.positionTitle} · ${v.company}`
  return (
    <CandidateShell brand={BRAND} agencyName={v.orgName} logo={null} width={680}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{PRODUCTS.takeHome.name} · take-home assessment</div>
      <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 2, marginBottom: 16 }}>{title}</div>

      {v.status === 'expired' && (
        <Alert tone="warning" title="This take-home has expired">The window to start it closed on {fmt(v.expiresAt)}. If you still want to take it, contact {v.orgName} for a new link.</Alert>
      )}

      {v.status === 'invited' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Hi {v.candidateFirstName}, here&apos;s how this works</h1>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { icon: <CalendarClock size={16} aria-hidden="true" />, text: <>Start any time before <strong>{fmt(v.expiresAt)}</strong>. The task stays hidden until you start.</> },
              { icon: <Clock size={16} aria-hidden="true" />, text: <>Once you start you have <strong>{v.config.durationMinutes} minutes</strong>. The clock keeps running if you close the page, and your work is saved as you go. When time runs out, what you have is submitted.</> },
              ...(v.config.defenseRequired ? [{ icon: <MessageSquareText size={16} aria-hidden="true" />, text: <>After you submit, a short spoken conversation (about 10 minutes) about your solution{v.config.defenseTiming === 'flexible' ? ', which you can do straight away or later' : ', straight after you submit'}. You need a microphone.</> }] : []),
              { icon: <ShieldCheck size={16} aria-hidden="true" />, text: v.config.aiPolicy === 'allowed' ? <>AI help is allowed: there&apos;s an AI assistant built into the editor. How you use it is part of the assessment, and you must be able to explain every line you submit.</> : <>Please work on your own: documentation and search are fine, AI coding assistants are not.</> },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.55, color: 'var(--lv-text-body)' }}>
                <span style={{ color: 'var(--lv-brand)', marginTop: 2 }}>{r.icon}</span><span>{r.text}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Use a laptop or desktop with a reliable connection. The editor runs in your browser; nothing to install.</p>
          <SolveNotice orgName={v.orgName} retentionDays={v.notice.retentionDays} defense={v.config.defenseRequired} aiAllowed={v.config.aiPolicy === 'allowed'} />
          {!v.consentGiven && (
            <ConsentCheckbox checked={agreed} onChange={setAgreed}>
              I&apos;ve read what this take-home captures and why, and I agree to it.
            </ConsentCheckbox>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <div>
            <Button loading={busy} disabled={!v.consentGiven && !agreed} onClick={start}>Start the take-home ({v.config.durationMinutes} min)</Button>
          </div>
        </div>
      )}

      {(v.status === 'submitted' || v.status === 'completed') && (() => {
        const d = v.defense
        if (d.status === 'pending' || d.status === 'in_progress') {
          return (
            <div style={{ display: 'grid', gap: 14 }}>
              <Alert tone="success" title={v.autoSubmitted ? 'Time\'s up — your work was submitted' : 'Your solution is submitted'}>One last step: a short conversation about your solution.{d.deadlineAt && d.status === 'pending' ? ` You can do it now or come back to this link any time before ${fmt(d.deadlineAt)}.` : ''}</Alert>
              <SolveDefense token={token} firstName={v.candidateFirstName} voiceAccent={d.voiceAccent} initialTurns={d.turns} inProgress={d.status === 'in_progress'} onDone={() => { /* stay on the finished view */ }} />
            </div>
          )
        }
        return (
          <div style={{ display: 'grid', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Thank you, {v.candidateFirstName}</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lv-text-body)', margin: 0 }}>
              {v.quality && v.quality !== 'ok'
                ? `We received your submission, but it doesn't contain work beyond the starter code. If something went wrong (the editor, your connection or the link), please let ${v.orgName} know.`
                : `Your take-home for ${v.positionTitle} is with ${v.orgName}'s hiring team. They'll be in touch about next steps.`}
            </p>
            {d.status === 'expired' && <Alert tone="info">The window for the follow-up conversation has closed. Your submission was still sent.</Alert>}
            <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>You can close this page.</p>
          </div>
        )
      })()}
    </CandidateShell>
  )
}
