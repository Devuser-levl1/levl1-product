import type { BoardConnector, BoardProvider } from './types'
import { naukriConnector } from './naukri'
import { indeedConnector } from './indeed'
import { linkedinConnector } from './linkedin'

// Connector registry — add a board later = one connector file + a registry entry.
const REGISTRY: Record<string, BoardConnector> = {
  naukri: naukriConnector,
  indeed: indeedConnector,
  linkedin: linkedinConnector,
}

export const BOARD_PROVIDERS: BoardProvider[] = ['naukri', 'indeed', 'linkedin']

export function getConnector(provider: string): BoardConnector | null {
  return REGISTRY[provider] ?? null
}

// Public catalog for the UI (no secrets) — label, auth type, capabilities, fields.
export function boardCatalog() {
  return BOARD_PROVIDERS.map((p) => {
    const c = REGISTRY[p]
    return { provider: c.provider, label: c.label, authType: c.authType, capabilities: c.capabilities, credFields: c.credFields }
  })
}

export type { BoardConnector, BoardCfg, BoardProvider } from './types'
