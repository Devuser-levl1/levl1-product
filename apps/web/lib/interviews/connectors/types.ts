// ── ATS connector framework: common interface (Phase 3) ───────────────────
// Every provider (levl1_hire, greenhouse, lever, salesforce) implements this
// one interface, returning NORMALIZED shapes that the sync service maps onto
// Interviews Position / Candidate. Adding a provider = a new file + a registry
// entry; the sync service and UI need no changes.

export type AtsProvider = 'levl1_hire' | 'greenhouse' | 'lever' | 'salesforce'
export type AuthType = 'oauth' | 'api_key'

// Normalized job → Interviews Position.
export interface NormalizedJob {
  externalId: string
  title: string
  company: string | null
  department: string | null
  location: string | null
  description: string | null   // → Position.jdText (no re-parse)
  status: string | null
}

// Normalized candidate → Interviews Candidate.
export interface NormalizedCandidate {
  externalId: string
  externalJobId: string | null // which external job this candidate belongs to
  name: string
  email: string
  phone: string | null
  currentTitle: string | null
  currentCompany: string | null
  linkedIn: string | null
  skills: string[]
  resumeText: string | null    // carried through so Interviews need not re-parse
}

// Decrypted connection context passed to a connector instance.
export interface ConnectorContext {
  agencyId: string
  credentials: Record<string, unknown>  // decrypted creds/tokens
  config: Record<string, unknown>        // non-secret config (may be mutated + persisted by the connector, e.g. refreshed token metadata)
}

export interface AtsConnector {
  provider: AtsProvider
  /** Validate credentials at connect time; may return config to persist (e.g. resolved account id). Throws on failure. */
  validate(): Promise<{ config?: Record<string, unknown> }>
  /** List jobs/postings from the source ATS. */
  listJobs(): Promise<NormalizedJob[]>
  /** List candidates/applications, optionally for a single external job. */
  listCandidates(externalJobId?: string): Promise<NormalizedCandidate[]>
  /** Fetch one candidate by external id (optional; used for on-demand import). */
  importCandidate?(externalId: string): Promise<NormalizedCandidate | null>
}

// Static metadata for the Integrations UI (no secrets).
export interface ProviderMeta {
  provider: AtsProvider
  label: string
  authType: AuthType
  implemented: boolean          // true = live; false = scaffolded "coming soon"
  // Credential fields the UI should collect (api_key providers).
  credentialFields?: { key: string; label: string; type?: 'text' | 'password' }[]
}
