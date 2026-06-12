import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const TYPES = ['call', 'email', 'meeting', 'note']

export const POST = withHireAuth(async (req, ctx, params) => {
  const contact = await prisma.hireContact.findFirst({ where: { id: params.id, client: { tenantId: ctx.tenantId } } })
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const type = TYPES.includes(body.type) ? body.type : 'note'

  const activity = await prisma.hireContactActivity.create({
    data: { contactId: contact.id, type, note: body.note || null, userId: ctx.userId },
  })
  await prisma.hireContact.update({ where: { id: contact.id }, data: { lastContactedAt: new Date() } })

  return NextResponse.json(activity, { status: 201 })
})
