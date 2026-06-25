import type { BoardConnector, BoardCfg } from './types'
import { NOT_IMPLEMENTED } from './types'

// Indeed (BYOB) — API-key auth. testConnection validates the supplied
// credentials are well-formed; a live Indeed API ping replaces this when wired.
export const indeedConnector: BoardConnector = {
  provider: 'indeed',
  label: 'Indeed',
  authType: 'api_key',
  capabilities: { canPost: true, canSearch: false },
  credFields: [
    { key: 'apiKey', label: 'API key / token', placeholder: 'Indeed-issued key or token' },
    { key: 'email', label: 'Account email', placeholder: 'you@yourcompany.com' },
  ],
  async testConnection(cfg: BoardCfg) {
    const apiKey = (cfg.apiKey || '').trim()
    const email = (cfg.email || '').trim()
    if (apiKey.length < 8) return { ok: false, error: 'API key/token looks too short.' }
    if (!email.includes('@')) return { ok: false, error: 'A valid account email is required.' }
    // TODO(next build): live authenticated call to Indeed to truly verify.
    return { ok: true, accountId: email }
  },
  async postJob() { return NOT_IMPLEMENTED },
  async search() { return NOT_IMPLEMENTED },
}
