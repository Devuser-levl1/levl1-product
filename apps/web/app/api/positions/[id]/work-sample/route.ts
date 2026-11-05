import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { ensureWorkSampleTask } from '@/lib/screen/workspace/ensure-task'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST — (re)generate the position's work-sample task from the JD. Recruiter
// edit access, agency-scoped. Tests are verified in Judge0 when configured.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const owned = await prisma.position.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const r = await ensureWorkSampleTask(params.id, true)
  if (!r.ok) return NextResponse.json({ error: `Couldn't generate a task. ${r.note}.` }, { status: 502 })
  const position = await prisma.position.findUnique({ where: { id: params.id }, select: { workSampleTask: true } })
  return NextResponse.json({ task: position?.workSampleTask ?? null, verified: r.verified, note: r.note })
}
