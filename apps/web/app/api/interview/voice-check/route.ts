import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { ttsModel, sttLiveModel, sttBatchModel, sttClientConfig, TTS_DEFAULT } from '@/lib/screen/interview/voice-config'
import { DEFAULT_INTERVIEWER_VOICE_ID } from '@/lib/screen/interviewer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/interview/voice-check[?latency=1]   (workspace ADMIN only)
// Verifies the configured ElevenLabs models are available on this account —
// the founder's pre-flight before switching models or a pilot:
//   • TTS: is ELEVENLABS_TTS_MODEL listed with can_do_text_to_speech?
//   • latency=1: speaks "Hello." on eleven_v4_turbo AND eleven_v4 through the
//     same streaming endpoint the interview uses → time-to-first-audio (A/B).
//   • STT live: opens a Scribe realtime session with the configured model +
//     commit strategy and waits for session_started (or the rejection reason).
//   • STT batch: reports the configured model (verified on first diarization;
//     a rejection is logged as stt_model_rejected).
// Nothing falls back silently: each check reports ok / the exact error.

const API = 'https://api.elevenlabs.io'

async function ttfb(key: string, model: string, voice: string) {
  const t0 = Date.now()
  try {
    const r = await fetch(`${API}/v1/text-to-speech/${voice}/stream?output_format=pcm_24000`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello.', model_id: model, language_code: 'en' }),
    })
    if (!r.ok || !r.body) return { model, ok: false, status: r.status, detail: (await r.text().catch(() => '')).slice(0, 200) }
    const reader = r.body.getReader()
    const first = await reader.read()
    const firstMs = Date.now() - t0
    let bytes = first.value?.length ?? 0
    for (;;) { const c = await reader.read(); if (c.done) break; bytes += c.value.length }
    return { model, ok: bytes > 0, firstAudioMs: firstMs, totalMs: Date.now() - t0, bytes }
  } catch (e) { return { model, ok: false, detail: String(e).slice(0, 200) } }
}

async function sttLiveCheck(key: string): Promise<Record<string, unknown>> {
  const cfg = sttClientConfig()
  const WS = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket
  const tokRes = await fetch(`${API}/v1/single-use-token/realtime_scribe`, { method: 'POST', headers: { 'xi-api-key': key } })
  if (!tokRes.ok) return { ...cfg, ok: false, stage: 'token', status: tokRes.status, detail: (await tokRes.text().catch(() => '')).slice(0, 200) }
  const { token } = (await tokRes.json()) as { token?: string }
  if (!WS) return { ...cfg, ok: null, stage: 'socket', detail: 'Server runtime has no WebSocket (Node < 22) — token minted OK; model verified on the first live interview (failures logged as stt_error).' }
  const params = new URLSearchParams({ model_id: cfg.model, audio_format: 'pcm_16000', commit_strategy: cfg.commitStrategy, token: token ?? '' })
  return await new Promise((resolve) => {
    const ws = new WS(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params}`)
    const done = (r: Record<string, unknown>) => { clearTimeout(timer); try { ws.close() } catch {} resolve({ ...cfg, ...r }) }
    const timer = setTimeout(() => done({ ok: false, stage: 'socket', detail: 'timeout waiting for session_started' }), 8000)
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data)) as { message_type?: string; error?: string; message?: string }
        if (m.message_type === 'session_started') done({ ok: true })
        else if (m.message_type && m.message_type !== 'partial_transcript') done({ ok: false, stage: 'socket', detail: `${m.message_type}${m.error || m.message ? `: ${m.error ?? m.message}` : ''}` })
      } catch { /* ignore */ }
    }
    ws.onerror = () => done({ ok: false, stage: 'socket', detail: 'socket error' })
    ws.onclose = (e) => done({ ok: false, stage: 'socket', detail: `closed ${e.code} ${e.reason || ''}`.trim() })
  })
}

export async function GET(req: NextRequest) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) return NextResponse.json({ ok: false, error: 'ELEVENLABS_API_KEY is not set' }, { status: 503 })

  let config: Record<string, unknown>
  try {
    config = { ttsModel: ttsModel(), sttLiveModel: sttLiveModel(), sttBatchModel: sttBatchModel(), stt: sttClientConfig() }
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 }) }

  // TTS model availability on this account.
  let tts: Record<string, unknown>
  try {
    const r = await fetch(`${API}/v1/models`, { headers: { 'xi-api-key': key } })
    const list = r.ok ? ((await r.json()) as { model_id: string; can_do_text_to_speech?: boolean; name?: string }[]) : []
    const find = (id: string) => list.find((m) => m.model_id === id)
    const cur = find(config.ttsModel as string)
    tts = {
      ok: !!cur?.can_do_text_to_speech,
      configured: config.ttsModel,
      listed: !!cur,
      canDoTts: cur?.can_do_text_to_speech ?? false,
      alternatives: Object.fromEntries(['eleven_v4_turbo', 'eleven_v4', 'eleven_flash_v2_5'].map((id) => [id, !!find(id)?.can_do_text_to_speech])),
      ...(r.ok ? {} : { status: r.status }),
    }
  } catch (e) { tts = { ok: false, detail: String(e).slice(0, 200) } }

  const voice = process.env.ELEVENLABS_VOICE_ID || DEFAULT_INTERVIEWER_VOICE_ID
  const latency = new URL(req.url).searchParams.get('latency') === '1'
    ? await Promise.all([ttfb(key, TTS_DEFAULT, voice), ttfb(key, 'eleven_v4', voice)])
    : undefined
  const sttLive = await sttLiveCheck(key)

  const ok = tts.ok === true && sttLive.ok !== false
  console.info(JSON.stringify({ evt: 'voice_check', ok, tts: tts.ok, sttLive: sttLive.ok, models: config }))
  return NextResponse.json({ ok, config, tts, latency, sttLive, sttBatch: { model: config.sttBatchModel, note: 'Verified on the first diarization; a rejected model is logged as stt_model_rejected.' } })
}
