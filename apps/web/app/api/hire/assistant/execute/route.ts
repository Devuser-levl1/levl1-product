import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { executeAgentAction } from '@/lib/hire/agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Apply an approved agent action. The panel posts back the proposal's payload
// (the SAME object returned by /assistant). Every target is re-validated for
// tenant ownership inside executeAgentAction, and each change is logged to the
// activity timeline as "Levl1 Agent (approved by {user})".
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const payload = body?.payload
  if (!payload || typeof payload !== 'object' || typeof payload.type !== 'string') {
    return NextResponse.json({ error: 'Missing action payload' }, { status: 400 })
  }
  try {
    const result = await executeAgentAction(ctx.tenantId, ctx.userId, payload as Record<string, unknown>)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (e) {
    console.error('[hire/assistant/execute] failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Action failed — please try again.' }, { status: 500 })
  }
})
