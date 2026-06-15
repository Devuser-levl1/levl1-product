import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SUPPORTED_EVENTS = ['interview.completed', 'report.ready']

// Edit a webhook endpoint (url, events, active).
export const PATCH = withHireAuth(async (req, ctx, params) => {
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  const data: { url?: string; events?: string[]; active?: boolean } = {}
  if (typeof body.url === 'string') {
    if (!/^https?:\/\//.test(body.url)) return NextResponse.json({ error: 'A valid https URL is required' }, { status: 400 })
    data.url = body.url.trim()
  }
  if (Array.isArray(body.events)) {
    const events = body.events.filter((e: string) => SUPPORTED_EVENTS.includes(e))
    if (events.length === 0) return NextResponse.json({ error: 'Select at least one event' }, { status: 400 })
    data.events = events
  }
  if (typeof body.active === 'boolean') data.active = body.active

  const updated = await prisma.webhookEndpoint.update({ where: { id: ep.id }, data })
  return NextResponse.json(updated)
})

// Remove a webhook endpoint (and its deliveries).
export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.webhookDelivery.deleteMany({ where: { endpointId: ep.id } })
  await prisma.webhookEndpoint.delete({ where: { id: ep.id } })
  return NextResponse.json({ success: true })
})
