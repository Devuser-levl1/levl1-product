import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteDemoSession } from '@/lib/screen/demo/cleanup'

export const dynamic = 'force-dynamic'

// Kill a demo session's data — called after a demo interview ends (the prospect
// has seen the report). Demo runs are EPHEMERAL: nothing is kept. Only deletes
// records explicitly tagged isDemo, so it can never touch real agency data.
// Accepts a JSON body OR a sendBeacon blob (Content-Type may be text/plain).
export async function POST(req: NextRequest) {
  try {
    let interviewId = ''
    try { const b = await req.json(); interviewId = String(b?.interviewId ?? '') }
    catch { try { interviewId = String(JSON.parse(await req.text())?.interviewId ?? '') } catch { /* ignore */ } }
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, isDemo: true, candidateId: true, positionId: true },
    })
    // Guard: only ever delete a genuinely-demo session.
    if (!interview || !interview.isDemo) return NextResponse.json({ ok: true, deleted: false })

    await deleteDemoSession(interview.candidateId, interview.positionId, interview.id)
    return NextResponse.json({ ok: true, deleted: true })
  } catch (err) {
    console.error('[demo/cleanup] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false }, { status: 200 }) // never surface to the prospect
  }
}
