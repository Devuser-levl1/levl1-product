// Provider-agnostic job-board connector interface. testConnection is real now;
// postJob/search are stubbed here and implemented in later builds. Callers never
// branch on provider — the registry hides it (mirrors lib/jobboards + ATS pattern).

export type BoardProvider = 'naukri' | 'indeed' | 'linkedin'
export type BoardAuthType = 'api_key' | 'oauth' | 'extension'

// Decrypted, in-scope-only credentials. NEVER persist or log these.
export type BoardCfg = Record<string, string>

export interface BoardCapabilities { canPost: boolean; canSearch: boolean }

// A credential / extra field the UI collects for this provider.
export interface BoardCredField { key: string; label: string; placeholder?: string }

// Normalized Levl1 job passed to a board mapper (decoupled from Prisma).
export interface JobForPosting {
  id: string
  title: string
  description: string
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  employmentType: string | null
  skills: string[]
  companyName: string | null
  applyUrl: string
}

export interface PostResult {
  status: 'pending' | 'posted' | 'failed'
  externalRefId?: string
  url?: string
  error?: string
}

export interface BoardConnector {
  provider: BoardProvider
  label: string
  authType: BoardAuthType
  capabilities: BoardCapabilities
  // Fields the connect form collects (empty for extension-based providers).
  credFields: BoardCredField[]
  // Extra posting fields this board requires that a Levl1 job lacks (e.g. Naukri
  // industry / role category). Prompted ONCE at post time, AI-suggested.
  postingExtraFields?: BoardCredField[]
  // Verify the credentials work. Real now (structural + best-effort) — a live
  // provider API ping graduates it when that API is available.
  testConnection(cfg: BoardCfg): Promise<{ ok: boolean; accountId?: string; error?: string }>
  // ── Posting (BYOB) — real payload mapping; live API swapped in once access
  //    is granted (returns status:'pending' until then). search ships later. ──
  postJob?(cfg: BoardCfg, job: JobForPosting, extra?: Record<string, string>): Promise<PostResult>
  updateJob?(cfg: BoardCfg, externalRefId: string, job: JobForPosting, extra?: Record<string, string>): Promise<PostResult>
  closeJob?(cfg: BoardCfg, externalRefId: string): Promise<PostResult>
  search?(cfg: BoardCfg, query: unknown): Promise<{ ok: false; error: string }>
}

export const NOT_IMPLEMENTED = { ok: false as const, error: 'Not implemented yet — searching ships in a later build.' }
// Honest holding state until a board's API partnership/credentials are live.
export const API_PENDING = (label: string): PostResult => ({ status: 'pending', error: `${label} API access not yet enabled — your posting is queued and will go live once API access is granted. Nothing was posted under a Levl1 account.` })
