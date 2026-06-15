import { AtsConnector, ConnectorContext } from './types'

// ── Lever connector (Phase 3 — SCAFFOLD) ───────────────────────────────────
// Behind the common interface so it slots in with no framework changes.
// Implement when a customer needs it: Lever API (api-key or OAuth), list
// postings (/v1/postings) + opportunities (/v1/opportunities).
export function leverConnector(_ctx: ConnectorContext): AtsConnector {
  const notReady = () => { throw new Error('The Lever connector is coming soon.') }
  return {
    provider: 'lever',
    async validate() { return notReady() },
    async listJobs() { return notReady() },
    async listCandidates() { return notReady() },
  }
}
