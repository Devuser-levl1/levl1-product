import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Disconnect a provider (removes the connection + its sync map; imported
// Positions/Candidates are left in place).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const conn = await prisma.atsConnection.findFirst({ where: { id: params.id, agencyId: session.agencyId } })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.atsConnection.delete({ where: { id: conn.id } }) // cascades AtsSyncedRecord
  return NextResponse.json({ success: true })
}
