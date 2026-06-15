import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SUPPORTED_EVENTS = ['interview.completed', 'report.ready']

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const endpoints = await prisma.interviewsWebhookEndpoint.findMany({ where: { agencyId: session.agencyId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(endpoints)
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const url = body.url && String(body.url).trim()
  if (!url || !/^https?:\/\//.test(url)) return NextResponse.json({ error: 'A valid https URL is required' }, { status: 400 })
  const events: string[] = Array.isArray(body.events) ? body.events.filter((e: string) => SUPPORTED_EVENTS.includes(e)) : []
  if (events.length === 0) return NextResponse.json({ error: 'Select at least one event' }, { status: 400 })

  const secret = 'whsec_' + crypto.randomBytes(24).toString('base64url')
  const endpoint = await prisma.interviewsWebhookEndpoint.create({ data: { agencyId: session.agencyId, url, secret, events, active: true } })
  return NextResponse.json(endpoint, { status: 201 })
}
