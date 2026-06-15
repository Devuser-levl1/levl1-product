import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInterviewsApiKey } from '@/lib/interviews/public-auth'

export const dynamic = 'force-dynamic'

// List the agency's Interviews API keys (prefix + lastUsed only).
export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const keys = await prisma.interviewsApiKey.findMany({
    where: { agencyId: session.agencyId },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(keys)
}

// Create an API key — raw key returned ONCE, only the hash is stored.
export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = (body.name && String(body.name).trim()) || 'API key'
  const { raw, prefix, hashedKey } = generateInterviewsApiKey()
  const key = await prisma.interviewsApiKey.create({
    data: { agencyId: session.agencyId, name, prefix, hashedKey },
    select: { id: true, name: true, prefix: true, createdAt: true },
  })
  return NextResponse.json({ ...key, key: raw }, { status: 201 })
}
