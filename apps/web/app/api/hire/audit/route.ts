import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { AUDIT_ACTION_LABELS } from '@/lib/hire/audit'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Admin-only, tenant-scoped audit trail. Filterable by actor, action and date
// range; `?format=csv` streams an export.
export const GET = withHireAuth(async (req, ctx) => {
  if (ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const actorUserId = sp.get('user')
  const action = sp.get('action')
  const from = sp.get('from')
  const to = sp.get('to')
  const format = sp.get('format')

  const where: Prisma.HireAuditLogWhereInput = { tenantId: ctx.tenantId }
  if (actorUserId) where.actorUserId = actorUserId
  if (action) where.action = action
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      // `to` is treated as an inclusive day → end of that day.
      ...(to ? { lte: new Date(new Date(to).getTime() + 86_400_000 - 1) } : {}),
    }
  }

  const rows = await prisma.hireAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: format === 'csv' ? 5000 : 500,
  })

  if (format === 'csv') {
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = ['Timestamp', 'Actor', 'Action', 'Target type', 'Target', 'From', 'To', 'Reason']
    const lines = rows.map((r) => [
      r.createdAt.toISOString(),
      r.actorName ?? '',
      AUDIT_ACTION_LABELS[r.action] ?? r.action,
      r.targetType ?? '',
      r.targetName ?? r.candidateName ?? '',
      r.fromStage ?? '',
      r.toStage ?? '',
      r.reason ?? '',
    ].map(esc).join(','))
    const csv = [header.join(','), ...lines].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      actorName: r.actorName,
      actorUserId: r.actorUserId,
      action: r.action,
      actionLabel: AUDIT_ACTION_LABELS[r.action] ?? r.action,
      targetType: r.targetType,
      targetName: r.targetName ?? r.candidateName,
      fromStage: r.fromStage,
      toStage: r.toStage,
      reason: r.reason,
      meta: r.meta,
    })),
    actionLabels: AUDIT_ACTION_LABELS,
  })
})
