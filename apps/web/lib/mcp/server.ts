import { TOOLS, TOOL_BY_NAME } from './tools'

// ── Minimal MCP-over-HTTP (JSON-RPC 2.0) server (Build 4) ───────────────────
// Implements initialize / tools/list / tools/call / ping. Stateless: each POST
// carries one JSON-RPC request (or a batch). Auth + tenant scoping are handled
// upstream by withApiKeyAuth; this layer only dispatches to read-only tools.

const SERVER_INFO = { name: 'levl1-hire', version: '1.0.0' }
const DEFAULT_PROTOCOL = '2024-11-05'

interface RpcRequest { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }
interface RpcResponse { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string } }

function ok(id: RpcRequest['id'], result: unknown): RpcResponse { return { jsonrpc: '2.0', id: id ?? null, result } }
function err(id: RpcRequest['id'], code: number, message: string): RpcResponse { return { jsonrpc: '2.0', id: id ?? null, error: { code, message } } }

async function handleOne(tenantId: string, apiKeyId: string, req: RpcRequest): Promise<RpcResponse | null> {
  const { method, id } = req

  // Notifications (no id) get no response.
  if (method?.startsWith('notifications/')) return null

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: (req.params?.protocolVersion as string) || DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'Read-only access to this Levl1 Hire account. Call list_jobs first to discover jobs, then search_candidates / pipeline_summary / recent_activity. All data is scoped to your API key.',
      })

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) })

    case 'tools/call': {
      const name = req.params?.name as string
      const args = (req.params?.arguments as Record<string, unknown>) ?? {}
      const tool = name ? TOOL_BY_NAME.get(name) : undefined
      // Audit log (tenant, tool, timestamp) — never logs the key itself.
      console.log('[mcp] %s tenant=%s key=%s tool=%s', new Date().toISOString(), tenantId, apiKeyId.slice(0, 8), name)
      if (!tool) return err(id, -32602, `Unknown tool: ${name}`)
      try {
        const result = await tool.run(tenantId, args)
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(result ?? null) }] })
      } catch (e) {
        console.error('[mcp] tool error %s:', name, e)
        return ok(id, { content: [{ type: 'text', text: `Error running ${name}: ${e instanceof Error ? e.message : 'failed'}` }], isError: true })
      }
    }

    default:
      return err(id, -32601, `Method not found: ${method ?? '(none)'}`)
  }
}

export async function handleMcp(tenantId: string, apiKeyId: string, body: unknown): Promise<RpcResponse | RpcResponse[] | null> {
  if (Array.isArray(body)) {
    const out = await Promise.all(body.map((r) => handleOne(tenantId, apiKeyId, r as RpcRequest)))
    const responses = out.filter((r): r is RpcResponse => r !== null)
    return responses.length ? responses : null
  }
  return handleOne(tenantId, apiKeyId, (body ?? {}) as RpcRequest)
}
