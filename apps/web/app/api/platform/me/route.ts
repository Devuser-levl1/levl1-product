import { NextResponse } from 'next/server'
import { withPlatformAuth } from '@/lib/platform/auth'

export const dynamic = 'force-dynamic'

// Returns the platform-staff identity, or 403 if the caller isn't staff.
export const GET = withPlatformAuth(async (_req, ctx) => {
  return NextResponse.json({ userId: ctx.userId, email: ctx.email, name: ctx.name })
})
