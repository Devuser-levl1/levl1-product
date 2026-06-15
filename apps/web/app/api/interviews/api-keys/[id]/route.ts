import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Revoke an Interviews API key (soft).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const key = await prisma.interviewsApiKey.findFirst({ where: { id: params.id, agencyId: session.agencyId } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.interviewsApiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ success: true })
}
