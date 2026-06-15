import { AtsConnector, ConnectorContext, ProviderMeta, AtsProvider } from './types'
import { levl1HireConnector } from './levl1-hire'
import { greenhouseConnector } from './greenhouse'
import { leverConnector } from './lever'
import { salesforceConnector } from './salesforce'

// ── Connector registry (Phase 3) ──────────────────────────────────────────
// Adding a provider = one factory + one PROVIDERS entry. The sync service and
// Integrations UI are driven entirely by this registry.

type Factory = (ctx: ConnectorContext) => AtsConnector

const FACTORIES: Record<AtsProvider, Factory | null> = {
  levl1_hire: levl1HireConnector,
  greenhouse: greenhouseConnector,
  lever: leverConnector,        // scaffold (throws "coming soon")
  salesforce: salesforceConnector, // scaffold (throws "coming soon")
}

export const PROVIDERS: ProviderMeta[] = [
  { provider: 'levl1_hire', label: 'Levl1 Hire', authType: 'api_key', implemented: true,
    credentialFields: [{ key: 'hireApiKey', label: 'Hire API key', type: 'password' }] },
  { provider: 'greenhouse', label: 'Greenhouse', authType: 'api_key', implemented: true,
    credentialFields: [{ key: 'apiKey', label: 'Harvest API key', type: 'password' }] },
  { provider: 'lever', label: 'Lever', authType: 'api_key', implemented: false },
  { provider: 'salesforce', label: 'Salesforce', authType: 'oauth', implemented: false },
]

export function providerMeta(provider: string): ProviderMeta | undefined {
  return PROVIDERS.find((p) => p.provider === provider)
}

export function getConnector(provider: string, ctx: ConnectorContext): AtsConnector {
  const factory = FACTORIES[provider as AtsProvider]
  const meta = providerMeta(provider)
  if (!factory || !meta?.implemented) throw new Error(`Connector "${provider}" is not available yet`)
  return factory(ctx)
}
