import { NextRequest, NextResponse } from 'next/server'
import { runNurtureCheckins } from '@/lib/hire/nurture'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET /api/cron/nurture-checkins — Lev sends every due post-placement check-in.
// Guarded by CRON_SECRET (Bearer or ?key=). Run daily.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const key = new URL(req.url).searchParams.get('key')
  if (secret && auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { checked, sent } = await runNurtureCheckins()
  return NextResponse.json({ checked, sent })
}
