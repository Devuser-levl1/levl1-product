import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const RESEND_API = 'https://api.resend.com'

/**
 * Create (or re-create) the agency's sending domain in Resend and return the
 * DNS records the agency must add. Stores senderEmail/Name + domain id.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })

    const { senderEmail, senderName } = await req.json()
    if (!senderEmail || !senderEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid sender email is required' }, { status: 400 })
    }
    if (!senderName) {
      return NextResponse.json({ error: 'Sender name is required' }, { status: 400 })
    }

    const domain = senderEmail.split('@')[1].toLowerCase()

    const res = await fetch(`${RESEND_API}/domains`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: domain }),
    })
    const data = await res.json().catch(() => ({}))

    // Resend returns 422 if the domain already exists — surface a clean message.
    if (!res.ok && res.status !== 422) {
      console.error('[email/verify-domain] Resend error:', data)
      return NextResponse.json({ error: data?.message ?? 'Could not create domain' }, { status: 502 })
    }

    const domainId: string | undefined = data?.id
    const records = data?.records ?? []

    await prisma.agency.update({
      where: { id: session.agencyId },
      data: {
        senderEmail,
        senderName,
        ...(domainId ? { resendDomainId: domainId } : {}),
        resendDomainVerified: false,
      },
    })

    return NextResponse.json({ domain, domainId: domainId ?? null, records })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to start domain verification'
    console.error('[email/verify-domain] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
