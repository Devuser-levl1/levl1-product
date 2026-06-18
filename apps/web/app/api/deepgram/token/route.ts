import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Deepgram short-lived STT credential (Build I-P0-3; bugfix) ──────────────
// The browser streams mic audio straight to Deepgram's WebSocket for the lowest
// latency, but the long-lived DEEPGRAM_API_KEY must never reach the client.
//
// We MINT A SCOPED, SHORT-LIVED TEMPORARY API KEY (Deepgram key-creation API,
// `time_to_live_in_seconds`) — the method available on standard plans. The older
// /v1/auth/grant approach 503'd on this plan, so it's gone. The temp key is
// scoped to `usage:write` (listen/STT only) and self-expires, so a harvested
// credential is near-worthless.
//
// No login gate: live-interview pages (incl. anonymous ?demo=1) need STT, like
// the integrity-ingest + warmup routes. Abuse is bounded by a per-IP rate limit,
// the short TTL, and the minimal scope. Client falls back to Web Speech on 503.

const KEY_TTL_SECONDS = Math.max(30, Number(process.env.DEEPGRAM_KEY_TTL_SECONDS ?? 60))
const PER_IP_PER_MIN = Math.max(1, Number(process.env.DEEPGRAM_TOKEN_RATE_PER_MIN ?? 12))

// Lightweight per-IP rate limit so the (anonymous) route can't be farmed for keys.
const WINDOW_MS = 60_000
const ipHits = new Map<string, number[]>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= PER_IP_PER_MIN) { ipHits.set(ip, recent); return true }
  recent.push(now); ipHits.set(ip, recent)
  return false
}

// Resolve the Deepgram project id (keys are created under a project). Prefer the
// env var; otherwise look it up once and cache it for the process lifetime.
let cachedProjectId: string | null = null
async function getProjectId(key: string): Promise<string | null> {
  if (process.env.DEEPGRAM_PROJECT_ID) return process.env.DEEPGRAM_PROJECT_ID
  if (cachedProjectId) return cachedProjectId
  const res = await fetch('https://api.deepgram.com/v1/projects', {
    headers: { Authorization: `Token ${key}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { projects?: Array<{ project_id?: string }> }
  cachedProjectId = data.projects?.[0]?.project_id ?? null
  return cachedProjectId
}

export async function POST(req: NextRequest) {
  const key = process.env.DEEPGRAM_API_KEY
  if (!key) {
    // Not configured → client falls back to the browser Web Speech recognizer.
    return NextResponse.json({ error: 'stt_unconfigured' }, { status: 503 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  try {
    const projectId = await getProjectId(key)
    if (!projectId) {
      console.warn('[deepgram/token] could not resolve project id (set DEEPGRAM_PROJECT_ID)')
      return NextResponse.json({ error: 'deepgram_project_unresolved — set DEEPGRAM_PROJECT_ID, or the key cannot list projects' }, { status: 503 })
    }

    const res = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: 'levl1-interview-ephemeral',
        scopes: ['usage:write'],            // listen/STT only
        time_to_live_in_seconds: KEY_TTL_SECONDS,
      }),
    })

    if (res.ok) {
      const data = (await res.json()) as { key?: string; api_key_id?: string }
      if (data.key) {
        // `kind: 'key'` → the browser authenticates the WS with the `token` subprotocol.
        return NextResponse.json({ token: data.key, kind: 'key', expiresIn: KEY_TTL_SECONDS })
      }
    }
    // Surface the precise Deepgram failure (status + short body) so it's diagnosable
    // from the browser Network tab without Render log access. A 401/403 here almost
    // always means the DEEPGRAM_API_KEY lacks key-creation rights — use an
    // Owner/Admin key (Member keys can't mint child keys).
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    console.warn('[deepgram/token] key creation failed:', res.status, detail)
    const hint = (res.status === 401 || res.status === 403)
      ? 'deepgram_key_lacks_key_creation_permission — use an Owner/Admin API key'
      : 'deepgram_key_creation_failed'
    return NextResponse.json({ error: hint, deepgramStatus: res.status, detail }, { status: 503 })
  } catch (err) {
    console.error('[deepgram/token]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'stt_token_failed' }, { status: 500 })
  }
}
