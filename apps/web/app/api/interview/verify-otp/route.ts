import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { interviewId, code } = await req.json()
    if (!interviewId || !code) {
      return NextResponse.json({ error: 'interviewId and code required' }, { status: 400 })
    }

    const v = await prisma.interviewVerification.findUnique({ where: { interviewId } })
    if (!v || !v.otpCode) {
      return NextResponse.json({ verified: false, error: 'No code requested' }, { status: 400 })
    }
    if (v.otpExpiresAt && v.otpExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ verified: false, error: 'Code expired — request a new one' }, { status: 400 })
    }
    if (String(code).trim() !== v.otpCode) {
      return NextResponse.json({ verified: false, error: 'Incorrect code' }, { status: 400 })
    }

    await prisma.interviewVerification.update({
      where: { interviewId },
      data: { otpVerifiedAt: new Date(), otpCode: null },
    })

    return NextResponse.json({ verified: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed'
    console.error('[verify-otp] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
