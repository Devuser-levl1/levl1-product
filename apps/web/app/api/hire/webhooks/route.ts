import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SUPPORTED_EVENTS = ['interview.completed', 'report.ready'] as const

// List webhook endpoints for the tenant.
export const GET = withHireAuth(async (_req, ctx) => {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(endpoints)
})

// Create a webhook endpoint. A signing secret is generated server-side.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const url = body.url && String(body.url).trim()
  if (!url || !/^https?:\/\//.test(url)) return NextResponse.json({ error: 'A valid https URL is required' }, { status: 400 })
  const events: string[] = Array.isArray(body.events)
    ? body.events.filter((e: string) => (SUPPORTED_EVENTS as readonly string[]).includes(e))
    : []
  if (events.length === 0) return NextResponse.json({ error: 'Select at least one event' }, { status: 400 })

  const secret = 'whsec_' + crypto.randomBytes(24).toString('base64url')
  const endpoint = await prisma.webhookEndpoint.create({
    data: { tenantId: ctx.tenantId, url, secret, events, active: true },
  })
  return NextResponse.json(endpoint, { status: 201 })
})
