import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPurposeToken } from '@/lib/hire/auth'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const claims = verifyPurposeToken(params.token)
    if (!claims || claims.purpose !== 'unsub' || !claims.email || !claims.tenantId) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }
    if (claims.audienceType === 'contacts') {
      await prisma.hireContact.updateMany({ where: { email: claims.email, client: { tenantId: claims.tenantId } }, data: { emailOptOut: true } })
    } else {
      await prisma.hireCandidate.updateMany({ where: { email: claims.email, tenantId: claims.tenantId }, data: { emailOptOut: true } })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not process unsubscribe' }, { status: 500 })
  }
}
