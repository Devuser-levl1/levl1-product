import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Hire auth (signup) is implemented in Sprint 1.
export async function POST() {
  return NextResponse.json({ error: 'Hire signup coming in Sprint 1' }, { status: 501 })
}
