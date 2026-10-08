import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findScopedInterview, requireControlRoomSession } from '@/lib/screen/control-room/access'

export const dynamic = 'force-dynamic'

// ── Recorded session audio (Screen-scoped, agency-gated) ───────────────────
// Streams the retained recording with HTTP Range support so the player can
// seek straight to a flagged moment. Private, never cached by shared proxies.

export async function GET(req: NextRequest, { params }: { params: { interviewId: string } }) {
  const session = requireControlRoomSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const interview = await findScopedInterview(params.interviewId, session.agencyId)
  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rec = await prisma.interviewRecording.findUnique({ where: { interviewId: interview.id }, select: { data: true, mimeType: true, expiresAt: true } })
  if (!rec || rec.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: 'No recording' }, { status: 404 })

  const total = rec.data.byteLength
  const headers: Record<string, string> = {
    'Content-Type': rec.mimeType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store',
  }
  const range = req.headers.get('range')?.match(/bytes=(\d*)-(\d*)/)
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : total - Number(range[2])
    let end = range[1] && range[2] ? Number(range[2]) : total - 1
    start = Math.max(0, start); end = Math.min(end, total - 1)
    if (start > end) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
    return new NextResponse(Buffer.from(rec.data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) },
    })
  }
  return new NextResponse(Buffer.from(rec.data), { status: 200, headers: { ...headers, 'Content-Length': String(total) } })
}
