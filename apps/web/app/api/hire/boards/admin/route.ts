import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/hire/boards/admin — admins see which team members connected which
// boards (tenant-scoped, never credentials).
export const GET = withHireAuth(async (_req, ctx) => {
  if (ctx.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const [rows, users] = await Promise.all([
    prisma.boardConnection.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, userId: true, provider: true, authType: true, email: true, accountId: true, status: true, lastUsedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
    prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true, email: true } }),
  ])
  const byId = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({ connections: rows.map((r) => ({ ...r, userName: byId.get(r.userId)?.name ?? '—', userEmail: byId.get(r.userId)?.email ?? '' })) })
})

// DELETE /api/hire/boards/admin?id=... — an admin revokes any team connection.
export const DELETE = withHireAuth(async (req, ctx) => {
  if (ctx.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const conn = await prisma.boardConnection.findFirst({ where: { id, tenantId: ctx.tenantId }, select: { id: true } })
  if (conn) await prisma.boardConnection.delete({ where: { id: conn.id } })
  return NextResponse.json({ ok: true })
})
