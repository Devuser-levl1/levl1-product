import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── Interviews-owned outbound webhooks (Phase 1) ───────────────────────────
// Same delivery + retry mechanism as lib/api/webhooks.ts, but keyed off the
// Interviews models (InterviewsWebhookEndpoint / InterviewsWebhookDelivery) and
// resolved by agencyId. NO Hire dependency.

export const MAX_ATTEMPTS = 5

function sign(secret: string, rawBody: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

/** Resolve the owning Agency for an interview (via its Position). */
export async function agencyIdForInterview(interviewId: string): Promise<string | null> {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId }, include: { position: { select: { agencyId: true } } } })
  return interview?.position?.agencyId ?? null
}

export async function dispatchInterviewsWebhook(agencyId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const endpoints = await prisma.interviewsWebhookEndpoint.findMany({ where: { agencyId, active: true, events: { has: event } } })
    if (endpoints.length === 0) return
    for (const ep of endpoints) {
      const delivery = await prisma.interviewsWebhookDelivery.create({ data: { endpointId: ep.id, event, payload: payload as object, status: 'pending' } })
      await attemptInterviewsDelivery(delivery.id).catch((e) => console.error('[interviews/webhooks] initial delivery failed:', e))
    }
  } catch (e) {
    console.error('[interviews/webhooks] dispatch failed (non-fatal):', e)
  }
}

export async function attemptInterviewsDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.interviewsWebhookDelivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.status === 'success') return true
  const endpoint = await prisma.interviewsWebhookEndpoint.findUnique({ where: { id: delivery.endpointId } })
  if (!endpoint || !endpoint.active) {
    await prisma.interviewsWebhookDelivery.update({ where: { id: deliveryId }, data: { status: 'failed', lastError: 'Endpoint missing or inactive' } })
    return false
  }

  const rawBody = JSON.stringify({ event: delivery.event, data: delivery.payload, deliveryId: delivery.id })
  const attempts = delivery.attempts + 1
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Levl1-Signature': sign(endpoint.secret, rawBody), 'X-Levl1-Event': delivery.event },
      body: rawBody,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (res.ok) {
      await prisma.interviewsWebhookDelivery.update({ where: { id: deliveryId }, data: { status: 'success', attempts, lastError: null } })
      console.log('[interviews/webhooks] delivered %s → %s (%d)', delivery.event, endpoint.url, res.status)
      return true
    }
    const body = await res.text().catch(() => '')
    await prisma.interviewsWebhookDelivery.update({ where: { id: deliveryId }, data: { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts, lastError: `HTTP ${res.status}: ${body.slice(0, 300)}` } })
    return false
  } catch (e) {
    await prisma.interviewsWebhookDelivery.update({ where: { id: deliveryId }, data: { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts, lastError: e instanceof Error ? e.message : String(e) } })
    return false
  }
}
