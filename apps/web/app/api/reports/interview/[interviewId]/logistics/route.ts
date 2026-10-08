import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ── Report: Logistics section (Screen-scoped, recruiter-only) ──────────────
// Deliberately NOT part of /api/reports/interview/[id]: the comp expectation
// and its verdict against the band are sensitive, so they're served only to a
// signed-in member of the owning agency. Never cached.

export async function GET(req: NextRequest, { params }: { params: { interviewId: string } }) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const row = await prisma.interviewLogistics.findFirst({
    where: { interviewId: params.interviewId, interview: { position: { agencyId: session.agencyId } } },
    select: { result: true, hardMismatch: true, updatedAt: true },
  })
  if (!row) return NextResponse.json({ logistics: null }, { headers: { 'Cache-Control': 'private, no-store' } })
  return NextResponse.json(
    { logistics: { ...(row.result as object), hardMismatch: row.hardMismatch, updatedAt: row.updatedAt } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
