import { NextRequest, NextResponse } from 'next/server'
import { runArReminders } from '@/lib/hire/ar'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET /api/cron/ar-reminders — send automatic overdue-invoice reminders.
// Guarded by CRON_SECRET (Bearer or ?key=), same as the other cron endpoints.
// Run this daily; each invoice is only reminded once per reminderIntervalDays.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const key = new URL(req.url).searchParams.get('key')
  if (secret && auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { checked, sent } = await runArReminders()
  return NextResponse.json({ checked, sent })
}
