import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getConnector } from '@/lib/hire/boards'
import { assertBoardEncryptionKey, encryptBoardSecret } from '@/lib/hire/boards/crypto'
import type { BoardCfg } from '@/lib/hire/boards/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/hire/boards/connect — verify board credentials, then store them
// (encrypted) for THIS recruiter. Credentials are write-only: never echoed back.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const provider = String(body.provider ?? '')
  const connector = getConnector(provider)
  if (!connector) return NextResponse.json({ error: 'Unknown board.' }, { status: 400 })
  if (connector.authType === 'extension') {
    return NextResponse.json({ error: 'LinkedIn sourcing works through the Levl1 Chrome extension — there’s nothing to connect here.' }, { status: 400 })
  }

  // Collect only the declared credential fields.
  const cfg: BoardCfg = {}
  for (const f of connector.credFields) cfg[f.key] = String(body[f.key] ?? '').trim()

  // Fail before touching real credentials if the encryption key is weak.
  try {
    assertBoardEncryptionKey()
  } catch (e) {
    console.error('[hire/boards/connect] encryption key check failed for', provider) // no secret
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Encryption is not configured securely.' }, { status: 500 })
  }

  const test = await connector.testConnection(cfg)
  if (!test.ok) {
    await prisma.boardConnection.upsert({
      where: { userId_provider: { userId: ctx.userId, provider } },
      update: { status: 'error', lastError: test.error ?? 'Connection failed', authType: connector.authType, canPost: connector.capabilities.canPost, canSearch: connector.capabilities.canSearch, tenantId: ctx.tenantId },
      create: { tenantId: ctx.tenantId, userId: ctx.userId, provider, authType: connector.authType, canPost: connector.capabilities.canPost, canSearch: connector.capabilities.canSearch, status: 'error', lastError: test.error ?? 'Connection failed' },
    }).catch(() => {})
    return NextResponse.json({ error: test.error ?? 'Could not connect — check your credentials.' }, { status: 400 })
  }

  const credentials = encryptBoardSecret(cfg)
  const accountId = test.accountId ?? cfg.accountId ?? null
  const email = cfg.email ?? null
  await prisma.boardConnection.upsert({
    where: { userId_provider: { userId: ctx.userId, provider } },
    update: { authType: connector.authType, tenantId: ctx.tenantId, email, accountId, credentials, canPost: connector.capabilities.canPost, canSearch: connector.capabilities.canSearch, status: 'connected', lastError: null, lastUsedAt: new Date() },
    create: { tenantId: ctx.tenantId, userId: ctx.userId, provider, authType: connector.authType, email, accountId, credentials, canPost: connector.capabilities.canPost, canSearch: connector.capabilities.canSearch, status: 'connected' },
  })

  console.log('[hire/boards/connect] connected', provider, 'status=connected') // provider + status only
  return NextResponse.json({ ok: true, provider, status: 'connected' })
})
