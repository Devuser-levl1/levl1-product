import type { BoardConnector, BoardCfg } from './types'
import { NOT_IMPLEMENTED } from './types'

// Naukri (BYOB) — API-key auth. Posting uses the recruiter's credits; search
// uses their Resdex subscription. testConnection validates the supplied
// credentials are well-formed; a live Naukri API ping replaces this when wired.
export const naukriConnector: BoardConnector = {
  provider: 'naukri',
  label: 'Naukri',
  authType: 'api_key',
  capabilities: { canPost: true, canSearch: true },
  credFields: [
    { key: 'apiKey', label: 'API key', placeholder: 'Naukri-issued API key' },
    { key: 'accountId', label: 'Account / client ID', placeholder: 'Your Naukri account id' },
  ],
  async testConnection(cfg: BoardCfg) {
    const apiKey = (cfg.apiKey || '').trim()
    const accountId = (cfg.accountId || '').trim()
    if (apiKey.length < 8) return { ok: false, error: 'API key looks too short — paste the full key Naukri issued.' }
    if (!accountId) return { ok: false, error: 'Account / client ID is required.' }
    // TODO(next build): live authenticated GET to Naukri to truly verify.
    return { ok: true, accountId }
  },
  async postJob() { return NOT_IMPLEMENTED },
  async search() { return NOT_IMPLEMENTED },
}
