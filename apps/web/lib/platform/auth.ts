import { NextRequest, NextResponse } from 'next/server'
import { getHireContext } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

// Staff allowlist — exact emails or @domain entries, comma-separated in
// PLATFORM_OWNER_EMAILS. Defaults to the owner so the console works out of the
// box; add employees by setting the env var on Render.
function staffAllowlist(): string[] {
  const raw = process.env.PLATFORM_OWNER_EMAILS || 'abma3005@gmail.com'
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

export function isStaffEmail(email?: string | null): boolean {
  if (!email) return false
  const e = email.toLowerCase()
  return staffAllowlist().some((entry) => (entry.startsWith('@') ? e.endsWith(entry) : e === entry))
}

export interface PlatformContext { userId: string; email: string; name: string }

/** Resolve platform-staff context from a valid Hire session + email allowlist. */
export async function getPlatformContext(req: NextRequest): Promise<PlatformContext | null> {
  const ctx = getHireContext(req)
  if (!ctx) return null
  const u = await prisma.hireUser.findUnique({ where: { id: ctx.userId }, select: { email: true, name: true } }).catch(() => null)
  if (!u || !isStaffEmail(u.email)) return null
  return { userId: ctx.userId, email: u.email, name: u.name }
}

type NextRouteParams = Record<string, string | string[]>

/** HOC for platform (owner/staff) API routes — cross-tenant by design, gated. */
export function withPlatformAuth(
  handler: (req: NextRequest, ctx: PlatformContext, params: Record<string, string>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params?: NextRouteParams } = {}) => {
    const pctx = await getPlatformContext(req)
    if (!pctx) return NextResponse.json({ error: 'Forbidden — platform staff only' }, { status: 403 })
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(context.params ?? {})) flat[k] = Array.isArray(v) ? v[0] : v
    try {
      return await handler(req, pctx, flat)
    } catch (err) {
      console.error('[platform] route error:', err instanceof Error ? err.message : err)
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
    }
  }
}
