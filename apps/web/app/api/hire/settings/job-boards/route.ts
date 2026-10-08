import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { listBoards, getConnector } from '@/lib/jobboards'

export const dynamic = 'force-dynamic'

// GET — all boards + this tenant's ENABLED state. Honest assisted model: a board
// is "enabled" (the tenant has an account there and assisted posting is
// available) or "not set up". No API credentials are stored — Levl1 never posts
// on the user's behalf; it assists them to post under their own account.
export const GET = withHireAuth(async (_req, ctx) => {
  const connectors = await prisma.jobBoardConnector.findMany({ where: { tenantId: ctx.tenantId } })
  const byBoard = new Map(connectors.map((c) => [c.board, c]))
  const boards = listBoards().map((b) => {
    const c = byBoard.get(b.board)
    const connector = getConnector(b.board)
    return {
      board: b.board,
      label: b.label,
      tier: b.tier,
      comingSoon: b.comingSoon,
      enabled: c ? c.active : false,
      accountUrl: c?.accountUrl ?? null,
      postUrl: connector?.postUrl ?? null,
      // Everything is assisted now — honest copy for the UI.
      assistedLabel: `Assisted — posts under your own ${b.label} account`,
    }
  })
  return NextResponse.json({ boards })
})

// POST — enable / disable a board for this tenant, with the tenant's own
// employer-account URL. Body: { board, enabled?, accountUrl? }. No credentials.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const board = body.board && String(body.board)
  if (!board) return NextResponse.json({ error: 'board is required' }, { status: 400 })
  const connector = getConnector(board)
  if (!connector) return NextResponse.json({ error: 'Unknown board' }, { status: 400 })
  if (connector.comingSoon) return NextResponse.json({ error: `${connector.label} is coming soon.` }, { status: 400 })

  const enabled = body.enabled !== false
  const accountUrl = typeof body.accountUrl === 'string' && body.accountUrl.trim() ? body.accountUrl.trim() : null

  const saved = await prisma.jobBoardConnector.upsert({
    where: { tenantId_board: { tenantId: ctx.tenantId, board } },
    update: { active: enabled, mode: 'assisted', accountUrl },
    create: { tenantId: ctx.tenantId, board, active: enabled, mode: 'assisted', accountUrl },
  })
  return NextResponse.json({ board: saved.board, enabled: saved.active, accountUrl: saved.accountUrl })
})
