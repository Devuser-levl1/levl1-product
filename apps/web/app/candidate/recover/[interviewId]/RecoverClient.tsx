'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateShell } from '@/components/screen/candidate/CandidateShell'
import { Alert, Button, Select } from '@/components/screen/ui'
import type { CandidatePortalData } from '@/lib/candidatePortal'

const REASONS = [
  { value: '', label: 'Choose what happened (optional)' },
  { value: 'browser', label: 'My browser or computer crashed' },
  { value: 'network', label: 'My internet connection dropped' },
  { value: 'mic_camera', label: 'My microphone or camera stopped working' },
  { value: 'device', label: 'Another problem with my device' },
  { value: 'other', label: 'Something else' },
]

export default function RecoverClient({ data, selfRetake }: { data: CandidatePortalData; selfRetake: boolean }) {
  const router = useRouter()
  const kq = data.linkKey ? `?k=${encodeURIComponent(data.linkKey)}` : ''
  const [reason, setReason] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState<'report' | 'retake' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const post = (action: 'report' | 'self_retake', r?: string) => fetch(`/api/interview/recovery${kq}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interviewId: data.interviewId, action, ...(r ? { reason: r } : {}) }),
  })

  // Tell the hiring team as soon as the candidate lands here (once per attempt, server-side).
  useEffect(() => { void post('report').catch(() => {}) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendReason() {
    if (!reason) return
    setBusy('report'); setError(null)
    try { const r = await post('report', reason); if (!r.ok) throw new Error(); setSent(true) }
    catch { setError('Couldn\'t send that. Please try again.') } finally { setBusy(null) }
  }

  async function restart() {
    setBusy('retake'); setError(null)
    try {
      const r = await post('self_retake', reason || undefined)
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error === 'needs_approval' ? 'A fresh attempt needs the hiring team\'s approval. They\'ve been told what happened.' : 'Couldn\'t start a fresh attempt. Please try again.')
      router.push(d.next || `/candidate/schedule/${data.interviewId}${kq}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn\'t start a fresh attempt.'); setBusy(null) }
  }

  const ended = data.recovery === 'terminated'
  return (
    <CandidateShell brand={data.brandColor} agencyName={data.agencyName} logo={data.agencyLogoUrl}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 8px' }}>
        {ended ? 'Your interview ended early' : 'Your interview didn\'t finish'}
      </h1>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lv-text-body)', margin: '0 0 16px' }}>
        {ended
          ? <>Your interview for <strong>{data.positionTitle}</strong> at {data.company} was ended before the last question.</>
          : <>It looks like your interview for <strong>{data.positionTitle}</strong> at {data.company} was interrupted, for example by a lost connection or a browser problem.</>}
        {' '}What you&apos;d answered so far is saved, and {data.agencyName} has been told.
        {selfRetake ? ' You can start a fresh attempt now.' : ' If a technical problem stopped you, they can send you a fresh attempt.'}
      </p>

      <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
        <label htmlFor="recover-reason" style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>What happened?</label>
        <Select id="recover-reason" value={reason} onChange={(e) => { setReason(e.target.value); setSent(false) }}>
          {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
        {!selfRetake && (
          <div>
            <Button variant="secondary" onClick={sendReason} disabled={!reason || sent} loading={busy === 'report'}>{sent ? 'Sent to the hiring team' : 'Send to the hiring team'}</Button>
          </div>
        )}
      </div>

      {selfRetake && (
        <div style={{ marginBottom: 16 }}>
          <Button onClick={restart} loading={busy === 'retake'}>Start a fresh attempt</Button>
          <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '8px 0 0' }}>The fresh attempt is the one that&apos;s reviewed. Use a laptop with a stable connection and a working microphone.</p>
        </div>
      )}
      {error && <Alert tone="danger" style={{ marginBottom: 12 }}>{error}</Alert>}
      {!selfRetake && <Alert tone="info">You don&apos;t need to do anything else. If {data.agencyName} approves a fresh attempt, you&apos;ll get a new link by email{' '}(and WhatsApp, if they have your number).</Alert>}
    </CandidateShell>
  )
}
