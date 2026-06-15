import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { encryptJson } from '@/lib/jobboards/crypto'
import { PROVIDERS, providerMeta, getConnector } from '@/lib/interviews/connectors'

export const dynamic = 'force-dynamic'

// GET — provider catalog + this agency's connection state (no secrets).
export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const connections = await prisma.atsConnection.findMany({
    where: { agencyId: session.agencyId },
    select: { id: true, provider: true, status: true, lastSyncedAt: true, lastError: true, config: true, createdAt: true },
  })
  const byProvider = new Map(connections.map((c) => [c.provider, c]))
  const providers = PROVIDERS.map((p) => {
    const conn = byProvider.get(p.provider)
    return {
      ...p,
      connection: conn ? { id: conn.id, status: conn.status, lastSyncedAt: conn.lastSyncedAt, lastError: conn.lastError, account: (conn.config as Record<string, unknown> | null)?.tenantName ?? null } : null,
    }
  })
  return NextResponse.json({ providers })
}

// POST — connect a provider. Body: { provider, credentials: {...} }.
// Validates the credentials via the connector, then stores them encrypted.
export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const provider = String(body.provider ?? '')
  const meta = providerMeta(provider)
  if (!meta) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  if (!meta.implemented) return NextResponse.json({ error: `${meta.label} is coming soon.` }, { status: 400 })

  const credentials = (body.credentials && typeof body.credentials === 'object') ? body.credentials as Record<string, unknown> : {}

  // Validate against the live source before persisting.
  let config: Record<string, unknown> = {}
  try {
    const connector = getConnector(provider, { agencyId: session.agencyId, credentials, config: {} })
    const result = await connector.validate()
    config = result.config ?? {}
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not validate credentials' }, { status: 400 })
  }

  const configJson = config as Prisma.InputJsonValue
  const connection = await prisma.atsConnection.upsert({
    where: { agencyId_provider: { agencyId: session.agencyId, provider } },
    update: { status: 'connected', authType: meta.authType, credentials: encryptJson(credentials), config: configJson, lastError: null },
    create: { agencyId: session.agencyId, provider, status: 'connected', authType: meta.authType, credentials: encryptJson(credentials), config: configJson },
    select: { id: true, provider: true, status: true, config: true },
  })
  return NextResponse.json({ id: connection.id, provider, status: connection.status, account: (connection.config as Record<string, unknown> | null)?.tenantName ?? null }, { status: 201 })
}
