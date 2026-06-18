import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── ElevenLabs Scribe realtime single-use token ────────────────────────────
// Mints a short-lived single-use token from the server-side ELEVENLABS_API_KEY
// (the SAME key used for TTS), so the browser can open the Scribe realtime WS
// without ever seeing the raw key. Single-use tokens need no special key scope,
// so this avoids the Deepgram keys:write / 503 problem entirely.
//
// No login gate: live-interview pages (incl. anonymous ?demo=1) need STT, like
// the TTS + integrity routes. Abuse is bounded by a per-IP rate limit + the
// token's short single-use TTL. Client falls back to Web Speech on any non-200.

const PER_IP_PER_MIN = Math.max(1, Number(process.env.SCRIBE_TOKEN_RATE_PER_MIN ?? 20))
const WINDOW_MS = 60_000
const ipHits = new Map<string, number[]>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= PER_IP_PER_MIN) { ipHits.set(ip, recent); return true }
  recent.push(now); ipHits.set(ip, recent)
  return false
}

export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) return NextResponse.json({ error: 'stt_unconfigured' }, { status: 503 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  try {
    // Single-use token (verified): POST /v1/single-use-token/realtime_scribe → { token }.
    // 15-min TTL, consumed on use; needs no special key scope.
    const res = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: { 'xi-api-key': key },
    })
    if (res.ok) {
      const data = (await res.json()) as { token?: string }
      if (data.token) return NextResponse.json({ token: data.token })
    }
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    console.warn('[elevenlabs/stt-token] mint failed:', res.status, detail)
    return NextResponse.json({ error: 'stt_token_failed', status: res.status, detail }, { status: 503 })
  } catch (err) {
    console.error('[elevenlabs/stt-token]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'stt_token_error' }, { status: 500 })
  }
}
