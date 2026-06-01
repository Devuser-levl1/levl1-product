import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { incrementInterviewUsage, checkInterviewAllowance } from '@/lib/checkUsage'

/** POST /api/usage — check allowance before starting an interview */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { action } = await req.json()

    if (action === 'check') {
      const result = await checkInterviewAllowance(session.agencyId)
      return NextResponse.json(result)
    }

    if (action === 'increment') {
      await incrementInterviewUsage(session.agencyId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Usage error'
    console.error('[usage] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
