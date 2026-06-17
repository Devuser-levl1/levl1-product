import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Reusable email templates — tenant-scoped. Tokens {{name}} {{job}} {{company}}
// are filled at send time from the candidate + job.
export const GET = withHireAuth(async (_req, ctx) => {
  const templates = await prisma.hireEmailTemplate.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, subject: true, body: true, updatedAt: true },
  })
  return NextResponse.json({ templates })
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  const tmplBody = String(body.body ?? '').trim()
  if (!name || !subject || !tmplBody) return NextResponse.json({ error: 'Name, subject and body are required' }, { status: 400 })

  const template = await prisma.hireEmailTemplate.create({
    data: { tenantId: ctx.tenantId, name, subject, body: tmplBody },
  })
  return NextResponse.json(template, { status: 201 })
})
