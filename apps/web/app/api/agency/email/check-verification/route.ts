import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const RESEND_API = 'https://api.resend.com'

/**
 * Ask Resend to (re)check the agency's domain DNS, then report verification
 * status. Flips agency.resendDomainVerified to true once Resend confirms.
 */
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })

    const agency = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    if (!agency.resendDomainId) {
      return NextResponse.json({ verified: false, status: 'not_started', records: [] })
    }

    const auth = { Authorization: `Bearer ${apiKey}` }

    // Trigger a fresh DNS check (best-effort), then read the current state.
    await fetch(`${RESEND_API}/domains/${agency.resendDomainId}/verify`, {
      method: 'POST', headers: auth,
    }).catch(() => {})

    const res = await fetch(`${RESEND_API}/domains/${agency.resendDomainId}`, { headers: auth })
    const data = await res.json().catch(() => ({}))

    const verified = data?.status === 'verified'
    if (verified && !agency.resendDomainVerified) {
      await prisma.agency.update({
        where: { id: session.agencyId },
        data: { resendDomainVerified: true },
      })
    }

    return NextResponse.json({
      verified,
      status: data?.status ?? 'unknown',
      records: data?.records ?? [],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to check verification'
    console.error('[email/check-verification] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
