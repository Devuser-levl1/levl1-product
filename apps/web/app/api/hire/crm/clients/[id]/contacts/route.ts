import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { requireCap } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (req, ctx, params) => {
  const denied = requireCap(ctx, 'crm'); if (denied) return denied
  const client = await prisma.hireClient.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Contact name required' }, { status: 400 })

  const contact = await prisma.hireContact.create({
    data: {
      clientId: client.id,
      name: String(body.name),
      email: body.email || null,
      phone: body.phone || null,
      role: body.role || null,
      linkedinUrl: body.linkedinUrl || null,
    },
  })
  return NextResponse.json(contact, { status: 201 })
})
