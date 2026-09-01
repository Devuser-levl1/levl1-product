import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppText } from '@/lib/whatsappService'

export const dynamic = 'force-dynamic'

// POST /api/hire/whatsapp/[id]/reply — reply to an inbound WhatsApp message via
// the existing Twilio integration; logs the outbound message so it shows in the
// thread. Tenant-scoped. Body: { body }.
export const POST = withHireAuth(async (req, ctx, params) => {
  const wa = await prisma.whatsAppMessage.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { fromNumber: true, fromName: true, candidateId: true, contactId: true } })
  if (!wa) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const text = String((await req.json().catch(() => ({}))).body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Message body is required' }, { status: 400 })

  const res = await sendWhatsAppText(wa.fromNumber, text)
  if (!res.ok) return NextResponse.json({ error: res.error ?? 'Could not send WhatsApp reply.' }, { status: 502 })

  await prisma.whatsAppMessage.create({
    data: {
      tenantId: ctx.tenantId, direction: 'outbound',
      fromNumber: process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '') ?? 'agency',
      toNumber: wa.fromNumber, fromName: 'You', body: text, twilioSid: res.sid ?? null,
      candidateId: wa.candidateId, contactId: wa.contactId, isRead: true,
      receivedAt: new Date(),
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
})
