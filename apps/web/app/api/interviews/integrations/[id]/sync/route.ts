import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runSync } from '@/lib/interviews/connectors/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Run a sync for a connection — pulls jobs → Positions and candidates →
// Candidates (idempotent). Returns the per-kind summary.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const conn = await prisma.atsConnection.findFirst({ where: { id: params.id, agencyId: session.agencyId } })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  console.log('[integrations/sync] agency=%s provider=%s', session.agencyId, conn.provider)
  const summary = await runSync(conn.id)
  return NextResponse.json(summary)
}
