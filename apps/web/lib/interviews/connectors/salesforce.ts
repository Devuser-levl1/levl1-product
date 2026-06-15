import { AtsConnector, ConnectorContext } from './types'

// ── Salesforce connector (Phase 3 — SCAFFOLD) ──────────────────────────────
// Behind the common interface. Implement when a customer needs it: OAuth 2.0
// (web-server flow, token refresh), then map SF recruiting objects (Talentcloud
// or a custom Job__c / Candidate__c) onto NormalizedJob / NormalizedCandidate
// via the SOQL query API.
export function salesforceConnector(_ctx: ConnectorContext): AtsConnector {
  const notReady = () => { throw new Error('The Salesforce connector is coming soon.') }
  return {
    provider: 'salesforce',
    async validate() { return notReady() },
    async listJobs() { return notReady() },
    async listCandidates() { return notReady() },
  }
}
