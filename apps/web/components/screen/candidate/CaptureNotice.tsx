'use client'

import { useState } from 'react'
import { ConsentCheckbox } from '@/components/interviews/ConsentCheckbox'

// ── Captured-data notice + specific consent (Screen-scoped) ────────────────
// Shown BEFORE any capture (join page, before the photo; interview room,
// before audio/camera start). Every statement here must stay true to the
// implementation — see lib/screen/privacy/{crypto,retention,policy}.ts:
//   • photo/audio/transcript/responses encrypted (AES-256-GCM) before storage
//   • camera CV runs in the browser; only event metadata is uploaded
//   • access: signed-in members of the hiring organisation (agency-scoped)
//   • processors: ElevenLabs (STT + interviewer voice), Anthropic (evaluation)
//   • retention: media / transcript periods from readCapturePolicy()
//   • withdrawal ("I withdraw my consent") ends the session and deletes media
// If any of those change, change this copy and bump CAPTURE_NOTICE_VERSION.

export interface CaptureNoticeProps {
  orgName: string
  mediaRetentionDays: number
  transcriptRetentionDays: number
}

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`

export function CaptureNotice({ orgName, mediaRetentionDays, transcriptRetentionDays }: CaptureNoticeProps) {
  const rows: { what: string; detail: string; why: string }[] = [
    { what: 'Photo', detail: 'One still photo when you check in.', why: `So ${orgName} can confirm it was you who took the interview.` },
    { what: 'Audio', detail: 'Your voice, recorded for the whole interview.', why: `Turned into text to evaluate your answers, checked for a second voice, and available for ${orgName} to replay.` },
    { what: 'Camera monitoring', detail: 'Your camera is analysed live, inside your browser. No video is recorded or uploaded — only events such as “face not visible” or “more than one person”, plus tab or window switches.', why: 'Interview integrity. Flags are reviewed by a person and never reject you automatically.' },
    { what: 'Transcript', detail: 'A written record of the conversation.', why: `Used by AI to prepare your evaluation report for ${orgName}.` },
  ]
  return (
    <div className="lv-capture-notice" style={{ textAlign: 'left', fontSize: 13, lineHeight: 1.55, color: 'var(--lv-text-body)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>What this interview captures, and why</div>
      <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.what} style={{ padding: '8px 10px', border: '1px solid var(--lv-border)', borderRadius: 6, background: 'var(--lv-surface)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--lv-text)' }}>{r.what}</dt>
            <dd style={{ margin: '2px 0 0' }}>{r.detail} <span style={{ color: 'var(--lv-text-muted)' }}>Why: {r.why}</span></dd>
          </div>
        ))}
      </dl>
      <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
        <li><strong>How it&apos;s stored:</strong> encrypted in transit (HTTPS) and encrypted at rest (AES-256). Only {orgName}&apos;s hiring team can access it.</li>
        <li><strong>Who processes it:</strong> Levl1, for {orgName}, with two service providers — ElevenLabs (speech-to-text and the interviewer&apos;s voice) and Anthropic (AI evaluation). It is not shared with anyone else and never sold.</li>
        <li><strong>How long it&apos;s kept:</strong> the photo and audio are deleted automatically {plural(mediaRetentionDays)} after the interview; the transcript after {plural(transcriptRetentionDays)}. Your evaluation report stays with your application until {orgName} deletes it.</li>
        <li><strong>Your choices:</strong> say “I withdraw my consent” at any point — the interview stops and your photo and recording are deleted. To see or delete your data, contact {orgName}.</li>
      </ul>
    </div>
  )
}

/** The separate, specific consent item for photo + recording + camera monitoring. */
export function MediaConsent({ interviewId, surface, consented, onConsented }: {
  interviewId: string
  surface: 'join' | 'room'
  consented: boolean
  onConsented: (at: string) => void
}) {
  const [checked, setChecked] = useState(consented)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <ConsentCheckbox
        checked={checked || consented}
        disabled={saving || consented}
        note={saving ? 'Recording your consent…' : consented ? 'Consent recorded' : undefined}
        onChange={async (next) => {
          if (!next || consented) return
          setChecked(true); setSaving(true); setError(null)
          try {
            const r = await fetch(`/api/schedule/${interviewId}/consent`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind: 'media', surface }),
            })
            if (!r.ok) throw new Error()
            const d = await r.json().catch(() => ({}))
            onConsented(typeof d.mediaConsentAt === 'string' ? d.mediaConsentAt : new Date().toISOString())
          } catch {
            setChecked(false)
            setError('We couldn’t record your consent — please check your connection and tick the box again.')
          } finally { setSaving(false) }
        }}>
        I agree to a <strong>verification photo</strong>, an <strong>audio recording</strong> of this interview and <strong>camera monitoring</strong>, used as described above.
      </ConsentCheckbox>
      {error && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: 'var(--lv-danger)', fontWeight: 600, textAlign: 'left' }}>{error}</div>}
    </div>
  )
}
