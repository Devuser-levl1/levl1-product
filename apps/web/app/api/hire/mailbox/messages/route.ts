import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/hire/mailbox/messages — this recruiter's pulled email PLUS the
// tenant's inbound WhatsApp, merged into one communication view. Each item is
// tagged with `channel` ('email' | 'whatsapp'). No full body here.
export const GET = withHireAuth(async (req, ctx) => {
  const filter = new URL(req.url).searchParams.get('filter') // 'jobspec' | undefined

  const conn = await prisma.mailboxConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId }, select: { id: true } })

  const emails = conn
    ? await prisma.mailboxMessage.findMany({
        where: { connectionId: conn.id, tenantId: ctx.tenantId, ...(filter === 'jobspec' ? { isJobSpec: true } : {}) },
        orderBy: { receivedAt: 'desc' },
        take: 100,
        select: {
          id: true, fromAddr: true, fromName: true, subject: true, snippet: true, receivedAt: true,
          isJobSpec: true, jobSpecConfidence: true, isRead: true, status: true, createdPositionId: true,
          attachments: { select: { id: true, filename: true, mimeType: true, sizeBytes: true, isResume: true } },
        },
      })
    : []

  const emailItems = emails.map((m) => ({ ...m, channel: 'email' as const, attachmentCount: m.attachments.length }))

  // WhatsApp is tenant-scoped (shared agency number). Not shown under the
  // "Job specs" filter, which is email-only.
  const waItems = filter === 'jobspec'
    ? []
    : (await prisma.whatsAppMessage.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { receivedAt: 'desc' },
        take: 100,
      })).map((w) => ({
        id: w.id,
        fromAddr: w.fromNumber,
        fromName: w.fromName,
        subject: 'WhatsApp message',
        snippet: w.body.replace(/\s+/g, ' ').slice(0, 200),
        receivedAt: w.receivedAt,
        isJobSpec: false,
        jobSpecConfidence: null as number | null,
        isRead: w.isRead,
        status: 'new',
        createdPositionId: null as string | null,
        channel: 'whatsapp' as const,
        attachments: [] as { id: string; filename: string; mimeType: string; sizeBytes: number; isResume: boolean }[],
        attachmentCount: 0,
      }))

  const messages = [...emailItems, ...waItems].sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt))
  return NextResponse.json({ messages })
})
