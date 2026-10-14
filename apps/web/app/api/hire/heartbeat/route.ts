import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'

export const dynamic = 'force-dynamic'

// Lightweight presence heartbeat. The work happens in withHireAuth/getHireContext
// (the throttled lastActiveAt refresh) — this just returns ok so an open tab can
// keep the user's "last seen" fresh while idle but present.
export const POST = withHireAuth(async () => NextResponse.json({ ok: true }))
