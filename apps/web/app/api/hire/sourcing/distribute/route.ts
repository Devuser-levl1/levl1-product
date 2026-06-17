import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { distributeJobToBoards } from '@/lib/jobboards/distribute'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST — distribute one ACTIVE job to ≥1 boards in a single call (Sourcing Hub
// outbound). Reuses the Build-1 distribution core. Per-board results.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const jobId = String(body.jobId ?? '')
  const boards: string[] = Array.isArray(body.boards) ? body.boards.filter((b: unknown) => typeof b === 'string') : []
  if (!jobId) return NextResponse.json({ error: 'Pick a job to distribute' }, { status: 400 })
  if (boards.length === 0) return NextResponse.json({ error: 'Select at least one board' }, { status: 400 })

  const results = await distributeJobToBoards(ctx.tenantId, jobId, boards)
  if (!results) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  console.log('[hire/sourcing/distribute] tenant=%s job=%s boards=%s', ctx.tenantId, jobId, boards.join(','))
  return NextResponse.json({ results })
})
