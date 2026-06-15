import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const SUPPORTED_EVENTS = ['interview.completed', 'report.ready']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ep = await prisma.interviewsWebhookEndpoint.findFirst({ where: { id: params.id, agencyId: session.agencyId } })
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
  const updated = await prisma.interviewsWebhookEndpoint.update({ where: { id: ep.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ep = await prisma.interviewsWebhookEndpoint.findFirst({ where: { id: params.id, agencyId: session.agencyId } })
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.interviewsWebhookDelivery.deleteMany({ where: { endpointId: ep.id } })
  await prisma.interviewsWebhookEndpoint.delete({ where: { id: ep.id } })
  return NextResponse.json({ success: true })
}
