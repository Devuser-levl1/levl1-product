import { NextRequest, NextResponse } from 'next/server'
import { getVoiceId } from '@/lib/voiceOptions'
import { DEFAULT_INTERVIEWER_VOICE_ID } from '@/lib/screen/interviewer'
import { isVoiceKey } from '@/lib/screen/interviewer-voice'
import { speakableTech } from '@/lib/screen/tech-terms'
import { getSessionFromRequest } from '@/lib/auth'
import { verifyVoiceToken } from '@/lib/screen/interview/voice-token'
import { ttsModel, ttsSupportsAudioTags } from '@/lib/screen/interview/voice-config'
import { stripAudioTags, limitAudioTags } from '@/lib/screen/interview/audio-tags'

export const dynamic = 'force-dynamic'

// ── Interviewer TTS (ElevenLabs, server-proxied) ───────────────────────────
// Auth (was: none — anyone could spend ElevenLabs credits):
//   • live interview  → header x-voice-token (from /api/interview/voice-session)
//   • recruiter voice previews (onboarding / settings / new position) → a
//     signed-in Screen session, short text only
// Output:
//   • { stream: true } → STREAMED raw PCM (s16le mono, X-Audio-Sample-Rate)
//     piped from ElevenLabs /stream as it is generated — first audio in ~1s,
//     no all-or-nothing wait (the old 8s timeout → robotic fallback).
//   • otherwise → a complete MP3 (previews; unchanged behaviour).
// Every request gets the tech-term pronunciation pass (C# → "C sharp").
// The key is read ONLY from ELEVENLABS_API_KEY (server-side). The model comes
// from ELEVENLABS_TTS_MODEL at request time (A/B eleven_v4_turbo ↔ eleven_v4,
// no rebuild). A rejected model fails LOUDLY — never a silent model swap.

const MAX_LINE_CHARS = 2500
const PREVIEW_MAX_CHARS = 400
const PCM_RATE = 24000
// Per-interview character budget (in-memory, per instance) — caps the damage of
// a leaked voice token. A full interview speaks well under this.
const BUDGET_CHARS = Number(process.env.VOICE_MAX_CHARS_PER_HOUR) || 40000
const BUDGET_WINDOW_MS = 60 * 60 * 1000
const budget = new Map<string, { start: number; used: number }>()

function spend(key: string, chars: number): boolean {
  const now = Date.now()
  const b = budget.get(key)
  if (!b || now - b.start > BUDGET_WINDOW_MS) { budget.set(key, { start: now, used: chars }); return true }
  if (b.used + chars > BUDGET_CHARS) return false
  b.used += chars
  return true
}

function resolveVoice(voiceAccent: unknown, voiceId: unknown): string {
  // Position/account voice key → explicit preview voiceId → env → baked Ananya.
  // NEXT_PUBLIC_ELEVENLABS_VOICE_ID is read here (server-side) ONLY so the live
  // voice doesn't change on deploy: the room used to send it as voiceId. A voice
  // id is not a secret. Once ELEVENLABS_VOICE_ID holds the same value it can go.
  return (
    (isVoiceKey(voiceAccent) ? getVoiceId(voiceAccent) : null) ||
    (typeof voiceId === 'string' && /^[A-Za-z0-9]{10,40}$/.test(voiceId) ? voiceId : null) ||
    process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ||
    process.env.ELEVENLABS_VOICE_ID ||
    DEFAULT_INTERVIEWER_VOICE_ID
  )
}

const VOICE_SETTINGS = { stability: 0.65, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true }

export async function POST(req: NextRequest) {
  const started = Date.now()
  const interviewId = verifyVoiceToken(req.headers.get('x-voice-token'))
  const session = interviewId ? null : getSessionFromRequest(req)
  if (!interviewId && !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { text?: unknown; voiceId?: unknown; voiceAccent?: unknown; stream?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const raw = typeof body.text === 'string' ? body.text.trim() : ''
  if (!raw) return NextResponse.json({ error: 'text required' }, { status: 400 })
  const limit = interviewId ? MAX_LINE_CHARS : PREVIEW_MAX_CHARS
  if (raw.length > limit) return NextResponse.json({ error: `text too long (max ${limit})` }, { status: 413 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error(JSON.stringify({ evt: 'voice_upstream_error', reason: 'ELEVENLABS_API_KEY not set', interviewId }))
    return NextResponse.json({ error: 'Voice is not configured' }, { status: 503 })
  }

  const budgetKey = interviewId ? `iv:${interviewId}` : `acct:${session!.agencyId}`
  if (!spend(budgetKey, raw.length)) {
    console.warn(JSON.stringify({ evt: 'voice_budget_exceeded', interviewId, agencyId: session?.agencyId }))
    return NextResponse.json({ error: 'Voice limit reached for this session' }, { status: 429 })
  }

  let modelId: string
  try { modelId = ttsModel() } catch (e) {
    console.error(JSON.stringify({ evt: 'voice_config_error', detail: e instanceof Error ? e.message : String(e) }))
    return NextResponse.json({ error: 'Voice model misconfigured' }, { status: 503 })
  }
  const stream = body.stream === true && !!interviewId
  const vid = resolveVoice(body.voiceAccent, body.voiceId)
  // Delivery tags only for models that understand them (≤2 per line).
  const tagged = ttsSupportsAudioTags(modelId) ? limitAudioTags(raw, 2) : stripAudioTags(raw)
  const text = speakableTech(tagged)
  const url = stream
    ? `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?output_format=pcm_${PCM_RATE}`
    : `https://api.elevenlabs.io/v1/text-to-speech/${vid}`

  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { Accept: stream ? 'audio/pcm' : 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ text, model_id: modelId, language_code: 'en', voice_settings: VOICE_SETTINGS }),
      signal: req.signal,   // candidate stopped listening (barge-in / navigation) → stop generating
    })
  } catch (err) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 })
    console.error(JSON.stringify({ evt: 'voice_upstream_error', reason: 'fetch_failed', detail: String(err).slice(0, 200), interviewId, ms: Date.now() - started }))
    return NextResponse.json({ error: 'Voice service unreachable' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    const detail = (await upstream.text().catch(() => '')).slice(0, 300)
    // 400/422 mentioning the model = the configured model isn't usable on this account/endpoint.
    const modelRejected = (upstream.status === 400 || upstream.status === 422 || upstream.status === 403) && /model/i.test(detail)
    console.error(JSON.stringify({ evt: modelRejected ? 'voice_model_rejected' : 'voice_upstream_error', status: upstream.status, detail, interviewId, model: modelId, voice: vid, chars: raw.length, ms: Date.now() - started }))
    // Don't leak upstream detail to the browser.
    return NextResponse.json({ error: `Voice service returned ${upstream.status}` }, { status: upstream.status === 429 ? 429 : 502 })
  }

  if (stream) {
    // Pipe bytes through as they arrive. audio/pcm isn't compressible, so the
    // server's gzip layer won't buffer it.
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': 'audio/pcm',
        'X-Audio-Sample-Rate': String(PCM_RATE),
        'X-Audio-Format': 's16le',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const audio = await upstream.arrayBuffer()
  return new NextResponse(audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(audio.byteLength), 'Cache-Control': 'no-store' },
  })
}
