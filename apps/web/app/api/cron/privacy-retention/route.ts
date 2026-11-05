import { NextRequest, NextResponse } from 'next/server'
import { runRetentionPurge } from '@/lib/screen/privacy/retention'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron endpoint — enforces the captured-data retention policy
 * (lib/screen/privacy/policy.ts): deletes photos + audio after
 * SCREEN_MEDIA_RETENTION_DAYS, transcripts/responses/snippets after
 * SCREEN_TRANSCRIPT_RETENTION_DAYS, live tails 24h after the interview.
 * Also runs as part of /api/cron/report-sweep, so one scheduler covers both.
 * Protected by CRON_SECRET (header `x-cron-secret` or `?secret=`) when set.
 */
export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
    if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await runRetentionPurge()) })
  } catch (err) {
    console.error('[cron/privacy-retention]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'retention_failed' }, { status: 500 })
  }
}
