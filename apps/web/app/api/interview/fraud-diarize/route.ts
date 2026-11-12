import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeDiarization, type ScribeBatchWord } from '@/lib/screen/integrity/diarization'
import { encryptString } from '@/lib/screen/privacy/crypto'
import { sttBatchModel } from '@/lib/screen/interview/voice-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 120  // batch STT on a full interview can take a while

// ── Post-interview fraud diarization (Scribe batch, ELEVENLABS_STT_BATCH_MODEL) ─────────────────────
// The browser uploads the recorded interview audio once the interview ends. We
// run ElevenLabs batch speech-to-text with diarization, detect any second/
// whispering voice, and persist those as `second_voice` integrity events feeding
// the Build 01/02 human-review summary. The audio is TRANSIENT — diarized here
// and never stored (sidesteps the no-object-storage constraint). Review-only;
// never auto-fails a candidate.
//
// Validated by interviewId (like the integrity-ingest route) so anonymous demo
// sessions work; abuse is bounded by the interview existing + audio size cap.
// Captured-data privacy: needs the candidate's media consent (demo runs have
// their own gate), is refused after consent withdrawal or outside the live
// window, and what the second voice said is stored encrypted (meta.transcriptEnc).

const MAX_BYTES = 60 * 1024 * 1024  // 60 MB ceiling
const UPLOAD_GRACE_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  try {
    const interviewId = new URL(req.url).searchParams.get('interviewId')?.trim()
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const key = process.env.ELEVENLABS_API_KEY
    if (!key) return NextResponse.json({ error: 'stt_unconfigured' }, { status: 503 })

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, isDemo: true, status: true, completedAt: true, mediaConsentGiven: true, consentWithdrawnAt: true },
    })
    if (!interview) return NextResponse.json({ error: 'interview not found' }, { status: 404 })
    if (!interview.isDemo && (!interview.mediaConsentGiven || interview.consentWithdrawnAt)) {
      return NextResponse.json({ error: 'no_consent' }, { status: 403 })
    }
    const live = interview.status === 'in_progress'
      || (interview.status === 'completed' && (!interview.completedAt || Date.now() - interview.completedAt.getTime() < UPLOAD_GRACE_MS))
    if (!live) return NextResponse.json({ error: 'not_live' }, { status: 409 })

    const buf = await req.arrayBuffer()
    if (!buf.byteLength) return NextResponse.json({ error: 'no audio' }, { status: 400 })
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: 'audio too large' }, { status: 413 })

    // Batch STT with diarization.
    const batchModel = sttBatchModel()   // throws loudly on a malformed value
    const form = new FormData()
    form.append('file', new Blob([buf], { type: req.headers.get('content-type') || 'audio/webm' }), 'interview.webm')
    form.append('model_id', batchModel)   // ELEVENLABS_STT_BATCH_MODEL (default scribe_v3)
    form.append('diarize', 'true')
    form.append('timestamps_granularity', 'word')
    const lang = process.env.SCRIBE_BATCH_LANGUAGE
    if (lang) form.append('language_code', lang)

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST', headers: { 'xi-api-key': key }, body: form,
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      // Loud: a rejected model must be visible, never silently swapped.
      console.error(JSON.stringify({ evt: /model/i.test(detail) ? 'stt_model_rejected' : 'stt_batch_error', status: res.status, model: batchModel, interviewId, detail }))
      return NextResponse.json({ error: 'diarize_failed', status: res.status }, { status: 502 })
    }

    const data = (await res.json()) as { words?: ScribeBatchWord[] }
    const segments = analyzeDiarization(data.words ?? [], {
      minWords: Number(process.env.FRAUD_DIARIZE_MIN_WORDS) || undefined,
      minDurationSec: Number(process.env.FRAUD_DIARIZE_MIN_SEC) || undefined,
    })

    if (segments.length) {
      const now = new Date()
      await prisma.interviewIntegrityEvent.createMany({
        data: segments.map((s) => ({
          interviewId,
          type: 'second_voice',
          occurredAt: now,
          durationMs: Math.round((s.endSec - s.startSec) * 1000),
          confidence: s.confidence,
          // The quote is re-attached for recruiter views by revealEvent() (lib/screen/privacy/fields.ts).
          detail: `Second voice (${s.speakerId}) ${s.startSec}s–${s.endSec}s`,
          meta: { speakerId: s.speakerId, startSec: s.startSec, endSec: s.endSec, wordCount: s.wordCount, transcriptEnc: encryptString(s.transcript), source: 'scribe_v2_batch' },
        })),
      })
    }

    console.log('[fraud-diarize] interview=%s segments=%d', interviewId, segments.length)
    return NextResponse.json({ secondVoiceSegments: segments.length, flagged: segments.length > 0 })
  } catch (err) {
    console.error('[fraud-diarize]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'diarize_error' }, { status: 500 })
  }
}
