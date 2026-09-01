import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { SUBMISSION_COLUMN_CATALOG, DEFAULT_SUBMISSION_COLUMNS, resolveColumns } from '@/lib/hire/submission'

export const dynamic = 'force-dynamic'

async function ownedClient(tenantId: string, id: string) {
  return prisma.hireClient.findFirst({ where: { id, tenantId }, select: { id: true, submissionColumns: true } })
}

// GET — this client's submission column template (+ the catalog & default).
export const GET = withHireAuth(async (_req, ctx, params) => {
  const client = await ownedClient(ctx.tenantId, params.id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isDefault = client.submissionColumns == null
  return NextResponse.json({
    columns: resolveColumns(client.submissionColumns),
    isDefault,
    catalog: SUBMISSION_COLUMN_CATALOG,
    defaults: DEFAULT_SUBMISSION_COLUMNS,
  })
})

// PUT { columns: string[] } — set this client's submission template (editable
// anytime). Unknown keys are dropped; empty falls back to the default set.
export const PUT = withHireAuth(async (req, ctx, params) => {
  const client = await ownedClient(ctx.tenantId, params.id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const columns = resolveColumns(body.columns)
  await prisma.hireClient.update({ where: { id: params.id }, data: { submissionColumns: columns } })
  return NextResponse.json({ ok: true, columns })
})
