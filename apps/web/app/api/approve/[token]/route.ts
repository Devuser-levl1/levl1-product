import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Question approval by email is RETIRED (Fixpack 9 #5): approval happens only
// in the app (position → Questions), the single source of truth. Links in
// emails sent before the change still work — they resolve to the in-app review.
// (JD and rubric approvals have their own routes and are unchanged.)

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const t = await prisma.approvalToken.findUnique({ where: { token: params.token }, select: { positionId: true, type: true } }).catch(() => null)
  if (!t) return NextResponse.json({ error: 'Invalid approval link' }, { status: 404 })
  const review = t.type === 'hr' ? 'hr' : 'tech_lead'
  return NextResponse.json({ redirectTo: `/positions/${t.positionId}?tab=questions&review=${review}` })
}

export async function POST() {
  return NextResponse.json({ error: 'Questions are now approved in the app. Open the position\'s Questions tab in Levl1 Screen.' }, { status: 410 })
}
