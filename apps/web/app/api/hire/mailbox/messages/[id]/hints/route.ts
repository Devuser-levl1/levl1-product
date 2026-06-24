import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { extractRequisitionHints, hasEconomicsHints } from '@/lib/hire/mailbox/extract-hints'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST — extract structured requisition hints from a job-spec email and try to
// match the sender's domain to an existing CRM client (for an optional linked
// deal). Ownership-scoped: the message must belong to THIS recruiter's mailbox.
export const POST = withHireAuth(async (_req, ctx, params) => {
  const msg = await prisma.mailboxMessage.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const conn = await prisma.mailboxConnection.findFirst({ where: { id: msg.connectionId, userId: ctx.userId, tenantId: ctx.tenantId }, select: { id: true } })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const hints = await extractRequisitionHints(msg.subject, msg.bodyText)

  // Best-effort client match by sender email domain (tenant-scoped).
  let client: { id: string; name: string } | null = null
  const domain = (msg.fromAddr || '').toLowerCase().split('@')[1]
  if (domain) {
    const clients = await prisma.hireClient.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true, website: true } })
    const match = clients.find((c) => (c.website || '').toLowerCase().includes(domain))
      || clients.find((c) => domain.includes(c.name.toLowerCase().replace(/[^a-z0-9]/g, '')))
    if (match) client = { id: match.id, name: match.name }
  }

  return NextResponse.json({ hints, hasEconomics: hasEconomicsHints(hints), client })
})
