import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── Outbound webhooks (Build 0) ────────────────────────────────────────────
// Lets external ATSs receive interview results automatically. Each delivery is
// a row in WebhookDelivery so failures can be retried by the cron job.

export const MAX_ATTEMPTS = 5

function sign(secret: string, rawBody: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

/**
 * Dispatch an event to all active endpoints of a tenant subscribed to it.
 * Creates a WebhookDelivery per endpoint and attempts immediate delivery;
 * failures are left for the retry cron.
 */
export async function dispatchWebhook(tenantId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { tenantId, active: true, events: { has: event } },
    })
    if (endpoints.length === 0) return

    for (const ep of endpoints) {
      const delivery = await prisma.webhookDelivery.create({
        data: { endpointId: ep.id, event, payload: payload as object, status: 'pending' },
      })
      await attemptDelivery(delivery.id).catch((e) => console.error('[webhooks] initial delivery failed:', e))
    }
  } catch (e) {
    console.error('[webhooks] dispatch failed (non-fatal):', e)
  }
}

/**
 * Attempt a single delivery. Signs the raw body with the endpoint secret and
 * POSTs. Updates the delivery row's status/attempts/lastError. Returns success.
 */
export async function attemptDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.status === 'success') return true

  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: delivery.endpointId } })
  if (!endpoint || !endpoint.active) {
    await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: 'failed', lastError: 'Endpoint missing or inactive' } })
    return false
  }

  const rawBody = JSON.stringify({ event: delivery.event, data: delivery.payload, deliveryId: delivery.id })
  const attempts = delivery.attempts + 1

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Levl1-Signature': sign(endpoint.secret, rawBody),
        'X-Levl1-Event': delivery.event,
      },
      body: rawBody,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (res.ok) {
      await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: 'success', attempts, lastError: null } })
      console.log('[webhooks] delivered %s → %s (%d)', delivery.event, endpoint.url, res.status)
      return true
    }
    const body = await res.text().catch(() => '')
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
    await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status, attempts, lastError: `HTTP ${res.status}: ${body.slice(0, 300)}` } })
    return false
  } catch (e) {
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
    await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status, attempts, lastError: e instanceof Error ? e.message : String(e) } })
    return false
  }
}
