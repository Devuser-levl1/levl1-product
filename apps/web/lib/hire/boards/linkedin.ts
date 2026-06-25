import type { BoardConnector, BoardCfg } from './types'
import { NOT_IMPLEMENTED } from './types'

// LinkedIn (BYOB) — extension-based. No API connector and NO credential storage:
// sourcing happens via the Levl1 Chrome extension on the recruiter's own logged-in
// session. testConnection is a no-op (nothing server-side to verify).
export const linkedinConnector: BoardConnector = {
  provider: 'linkedin',
  label: 'LinkedIn',
  authType: 'extension',
  capabilities: { canPost: false, canSearch: true },
  credFields: [], // extension — no credentials collected or stored
  async testConnection(_cfg: BoardCfg) {
    return { ok: true }
  },
  // No postJob — LinkedIn is sourcing-only (extension); posting is excluded.
  async search() { return NOT_IMPLEMENTED },
}
