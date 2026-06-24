import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncConnection } from '@/lib/hire/mailbox/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET /api/cron/mailbox-sync — polls every connected mailbox. Guarded by
// CRON_SECRET (Bearer or ?key=). v1 = poll (no IMAP IDLE/push).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const key = new URL(req.url).searchParams.get('key')
  if (secret && auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conns = await prisma.mailboxConnection.findMany({ where: { status: 'connected', credentials: { not: null } } })
  let total = 0
  for (const conn of conns) {
    try { const { newCount } = await syncConnection(conn); total += newCount } catch { /* per-conn errors already recorded */ }
  }
  return NextResponse.json({ mailboxes: conns.length, newMessages: total })
}
