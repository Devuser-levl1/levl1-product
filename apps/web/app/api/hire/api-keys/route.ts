import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/api/public-auth'

export const dynamic = 'force-dynamic'

// List API keys (prefix + lastUsed only — never the raw key or full hash).
export const GET = withHireAuth(async (_req, ctx) => {
  const keys = await prisma.apiKey.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(keys)
})

// Create an API key. The raw key is returned ONCE here and never stored.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const name = (body.name && String(body.name).trim()) || 'API key'
  const { raw, prefix, hashedKey } = generateApiKey()
  const key = await prisma.apiKey.create({
    data: { tenantId: ctx.tenantId, name, prefix, hashedKey },
    select: { id: true, name: true, prefix: true, createdAt: true },
  })
  // `key` (raw) is included ONLY in this response.
  return NextResponse.json({ ...key, key: raw }, { status: 201 })
})
