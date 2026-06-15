import { NextResponse } from 'next/server'
import { withApiKeyAuth } from '@/lib/api/public-auth'
import { handleMcp } from '@/lib/mcp/server'

export const dynamic = 'force-dynamic'

// MCP-over-HTTP endpoint (Build 4). Same API keys as the public API (Build 0);
// withApiKeyAuth resolves the tenant + enforces the rate limit. Read-only tools.
//
// Add to an MCP client (e.g. Claude Desktop) via the mcp-remote bridge:
//   npx mcp-remote https://levl1.io/api/mcp --header "Authorization: Bearer <API_KEY>"
export const POST = withApiKeyAuth(async (req, ctx) => {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 }) }

  const result = await handleMcp(ctx.tenantId, ctx.apiKeyId, body)
  // Notifications produce no body (HTTP 202).
  if (result === null) return new NextResponse(null, { status: 202 })
  return NextResponse.json(result)
})

// Some clients probe with GET; advertise the endpoint is alive (auth still required).
export const GET = withApiKeyAuth(async () => {
  return NextResponse.json({ server: 'levl1-hire', transport: 'mcp-over-http', methods: ['initialize', 'tools/list', 'tools/call', 'ping'] })
})
