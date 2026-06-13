import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, name, product } = await req.json()
    if (!email || !String(email).includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    await prisma.waitlistSignup.create({
      data: { email: String(email).trim().toLowerCase(), name: name ? String(name) : null, product: product ? String(product) : 'upword' },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[waitlist] error:', err)
    return NextResponse.json({ error: 'Could not join the waitlist' }, { status: 500 })
  }
}
