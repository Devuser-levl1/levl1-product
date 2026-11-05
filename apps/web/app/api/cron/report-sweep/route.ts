import { NextRequest, NextResponse } from 'next/server'
import { runReportSweep } from '@/lib/screen/report/sweep'
import { runRetentionPurge } from '@/lib/screen/privacy/retention'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron endpoint — generates reports for completed/abandoned interviews that
 * have none (Fixpack 6 #3), then runs the captured-data retention purge.
 * Trigger every ~10 min from a scheduler.
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
    const result = await runReportSweep({ limit: 10 })
    // Same scheduler also enforces captured-data retention (privacy build).
    const retention = await runRetentionPurge().catch((e) => {
      console.error('[cron/report-sweep] retention purge failed:', e instanceof Error ? e.message : e)
      return null
    })
    return NextResponse.json({ ok: true, ...result, retention })
  } catch (err) {
    console.error('[cron/report-sweep]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'sweep_failed' }, { status: 500 })
  }
}
