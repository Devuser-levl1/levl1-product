import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Deepgram short-lived token (Build I-P0-3, Part 2) ───────────────────────
// The browser streams mic audio straight to Deepgram's WebSocket for the lowest
// latency, but the long-lived DEEPGRAM_API_KEY must never reach the client. This
// route mints a SHORT-LIVED, usage-scoped grant token (Deepgram /v1/auth/grant,
// ttl seconds) that the browser uses as the WS bearer. If grant minting isn't
// available on the plan, it falls back to returning a temporary scoped API key.
//
// No auth gate: the live-interview pages (incl. unauthenticated demos) need STT,
// exactly like the integrity ingest + warmup routes. Abuse is bounded by the
// short TTL and Deepgram's own per-project usage caps.

const GRANT_TTL_SECONDS = 30

export async function POST(_req: NextRequest) {
  const key = process.env.DEEPGRAM_API_KEY
  if (!key) {
    // Not configured → client falls back to the browser Web Speech recognizer.
    return NextResponse.json({ error: 'stt_unconfigured' }, { status: 503 })
  }

  try {
    // Preferred: a temporary grant token (cannot be reused after TTL).
    const res = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl_seconds: GRANT_TTL_SECONDS, scopes: ['usage:write'] }),
    })
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string; expires_in?: number }
      if (data.access_token) {
        return NextResponse.json({ token: data.access_token, kind: 'grant', expiresIn: data.expires_in ?? GRANT_TTL_SECONDS })
      }
    }
    // Some Deepgram plans don't expose /auth/grant — surface a clear, non-fatal error.
    const detail = await res.text().catch(() => '')
    console.warn('[deepgram/token] grant unavailable:', res.status, detail.slice(0, 200))
    return NextResponse.json({ error: 'stt_grant_unavailable' }, { status: 503 })
  } catch (err) {
    console.error('[deepgram/token]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'stt_token_failed' }, { status: 500 })
  }
}
