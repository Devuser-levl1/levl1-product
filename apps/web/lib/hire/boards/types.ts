// Provider-agnostic job-board connector interface. testConnection is real now;
// postJob/search are stubbed here and implemented in later builds. Callers never
// branch on provider — the registry hides it (mirrors lib/jobboards + ATS pattern).

export type BoardProvider = 'naukri' | 'indeed' | 'linkedin'
export type BoardAuthType = 'api_key' | 'oauth' | 'extension'

// Decrypted, in-scope-only credentials. NEVER persist or log these.
export type BoardCfg = Record<string, string>

export interface BoardCapabilities { canPost: boolean; canSearch: boolean }

// A credential field the connect form should collect for this provider.
export interface BoardCredField { key: string; label: string; placeholder?: string }

export interface BoardConnector {
  provider: BoardProvider
  label: string
  authType: BoardAuthType
  capabilities: BoardCapabilities
  // Fields the connect form collects (empty for extension-based providers).
  credFields: BoardCredField[]
  // Verify the credentials work. Real now (structural + best-effort) — a live
  // provider API ping graduates it when that API is available.
  testConnection(cfg: BoardCfg): Promise<{ ok: boolean; accountId?: string; error?: string }>
  // ── Stubs for later builds — DO NOT implement here. ──
  postJob?(cfg: BoardCfg, job: unknown): Promise<{ ok: false; error: string }>
  search?(cfg: BoardCfg, query: unknown): Promise<{ ok: false; error: string }>
}

export const NOT_IMPLEMENTED = { ok: false as const, error: 'Not implemented yet — posting/searching ship in a later build.' }
