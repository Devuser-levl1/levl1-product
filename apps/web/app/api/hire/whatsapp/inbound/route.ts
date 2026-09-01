import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Empty TwiML — Twilio expects a 200 with XML. */
function twiml() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// POST — Twilio inbound WhatsApp webhook for the Hire product. Persists the
// message so it shows in the recruiter's inbox next to email. The message is
// attributed to a tenant by matching the sender's phone to a known HireCandidate
// or HireContact (the only safe multi-tenant mapping without a number registry).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const from = String(form.get('From') ?? '')       // e.g. "whatsapp:+9198..."
    const to = String(form.get('To') ?? '')
    const body = String(form.get('Body') ?? '')
    const sid = String(form.get('MessageSid') ?? '') || null
    const profileName = String(form.get('ProfileName') ?? '') || null

    const digits = from.replace(/\D/g, '')
    const last10 = digits.slice(-10)
    if (!last10 || !body.trim()) return twiml()

    // Dedupe Twilio retries by SID.
    if (sid) {
      const existing = await prisma.whatsAppMessage.findUnique({ where: { twilioSid: sid }, select: { id: true } })
      if (existing) return twiml()
    }

    // Resolve the tenant by matching the sender to a candidate or contact.
    const candidate = await prisma.hireCandidate.findFirst({ where: { phone: { contains: last10 } }, select: { id: true, tenantId: true, name: true }, orderBy: { createdAt: 'desc' } })
    const contact = candidate ? null : await prisma.hireContact.findFirst({ where: { phone: { contains: last10 } }, select: { id: true, name: true, client: { select: { tenantId: true } } } })
    const tenantId = candidate?.tenantId ?? contact?.client?.tenantId ?? null
    if (!tenantId) {
      console.warn('[hire/whatsapp/inbound] no tenant match for sender ending', last10)
      return twiml()
    }

    await prisma.whatsAppMessage.create({
      data: {
        tenantId, direction: 'inbound',
        fromNumber: digits ? `+${digits}` : from, toNumber: to.replace(/\D/g, '') ? `+${to.replace(/\D/g, '')}` : to,
        fromName: candidate?.name ?? contact?.name ?? profileName,
        body: body.slice(0, 8000), twilioSid: sid,
        candidateId: candidate?.id ?? null, contactId: contact?.id ?? null,
        receivedAt: new Date(),
      },
    })
    console.log('[hire/whatsapp/inbound] stored WhatsApp message for tenant', tenantId)
    return twiml()
  } catch (e) {
    console.error('[hire/whatsapp/inbound] error:', e instanceof Error ? e.message : e)
    return twiml()
  }
}
