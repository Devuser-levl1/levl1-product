import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { listBoards, getConnector } from '@/lib/jobboards'
import { encryptJson } from '@/lib/jobboards/crypto'

export const dynamic = 'force-dynamic'

// GET — all boards + this tenant's connection state (creds never returned).
export const GET = withHireAuth(async (_req, ctx) => {
  const connectors = await prisma.jobBoardConnector.findMany({ where: { tenantId: ctx.tenantId } })
  const byBoard = new Map(connectors.map((c) => [c.board, c]))
  const boards = listBoards().map((b) => {
    const c = byBoard.get(b.board)
    return {
      ...b,
      connected: c ? c.active : false,
      mode: c?.mode ?? b.mode,
      hasCredentials: !!c?.credentials,
    }
  })
  return NextResponse.json({ boards })
})

// POST — connect/disconnect a board and store creds (encrypted at rest).
// Body: { board, active?, mode?, credentials? }
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const board = body.board && String(body.board)
  if (!board) return NextResponse.json({ error: 'board is required' }, { status: 400 })
  const connector = getConnector(board)
  if (!connector) return NextResponse.json({ error: 'Unknown board' }, { status: 400 })
  if (connector.comingSoon) return NextResponse.json({ error: `${connector.label} is coming soon.` }, { status: 400 })

  const mode = body.mode === 'api' ? 'api' : 'assisted'
  const active = body.active !== false
  // Only (re)encrypt when fresh creds are provided; never store plaintext.
  const encrypted = body.credentials && typeof body.credentials === 'object'
    ? encryptJson(body.credentials)
    : undefined

  const existing = await prisma.jobBoardConnector.findUnique({ where: { tenantId_board: { tenantId: ctx.tenantId, board } } })
  const saved = await prisma.jobBoardConnector.upsert({
    where: { tenantId_board: { tenantId: ctx.tenantId, board } },
    update: { active, mode, ...(encrypted !== undefined ? { credentials: encrypted } : {}) },
    create: { tenantId: ctx.tenantId, board, active, mode, credentials: encrypted ?? undefined },
  })
  return NextResponse.json({ board: saved.board, active: saved.active, mode: saved.mode, hasCredentials: !!saved.credentials, created: !existing })
})
