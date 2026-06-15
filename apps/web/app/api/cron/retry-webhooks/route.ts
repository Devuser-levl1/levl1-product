import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { attemptDelivery, MAX_ATTEMPTS } from '@/lib/api/webhooks'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint — retries pending webhook deliveries with backoff.
 * Secure with CRON_SECRET (header `x-cron-secret` or `?secret=`).
 * Backoff: a delivery is only retried once its (attempts^2) minute window has
 * elapsed since it was created/last tried. Max 5 attempts (then marked failed).
 */
export async function POST(req: NextRequest) { return run(req) }
export async function GET(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
    if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const pending = await prisma.webhookDelivery.findMany({
    where: { status: 'pending', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  let retried = 0, succeeded = 0
  for (const d of pending) {
    // Exponential-ish backoff: wait attempts^2 minutes between tries.
    const dueAt = d.createdAt.getTime() + Math.pow(Math.max(1, d.attempts), 2) * 60_000
    if (d.attempts > 0 && dueAt > now) continue
    retried++
    const okDelivered = await attemptDelivery(d.id).catch(() => false)
    if (okDelivered) succeeded++
  }

  console.log('[cron/retry-webhooks] retried=%d succeeded=%d (of %d pending)', retried, succeeded, pending.length)
  return NextResponse.json({ retried, succeeded, pending: pending.length })
}
