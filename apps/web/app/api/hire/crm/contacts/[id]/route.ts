import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireContact.findFirst({ where: { id: params.id, client: { tenantId: ctx.tenantId } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const contact = await prisma.hireContact.update({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
      role: body.role ?? existing.role,
      linkedinUrl: body.linkedinUrl ?? existing.linkedinUrl,
    },
  })
  return NextResponse.json(contact)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireContact.findFirst({ where: { id: params.id, client: { tenantId: ctx.tenantId } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.hireContactActivity.deleteMany({ where: { contactId: existing.id } })
  await prisma.hireContact.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
})
