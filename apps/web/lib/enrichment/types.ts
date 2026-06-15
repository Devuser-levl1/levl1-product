// ── Candidate enrichment: shared types (Build 3) ───────────────────────────
// Role-agnostic. Providers are modular; the runner executes all `universal`
// providers plus any whose `relevantFor` matches (or whose `shouldRun` returns
// true), merges partial results, and records which sources contributed.

export type RoleFamily =
  | 'engineering' | 'sales' | 'finance' | 'marketing'
  | 'operations' | 'healthcare' | 'generalist'

export interface NormalizedProfile {
  currentTitle: string | null
  currentEmployer: string | null
  yearsExperience: number | null
  location: string | null
  skills: string[]
  education: string[]
  certifications: string[]
}

export interface CompanyContext {
  name: string
  industry: string | null
  sizeBand: string | null   // e.g. "1-10", "11-50", "51-200", "201-1000", "1000+"
  location: string | null
}

export interface GithubPinned { name: string; stars: number; language: string | null; url: string; description: string | null }
export interface GithubData {
  handle: string
  profileUrl: string
  publicRepos: number
  followers: number
  topLanguages: string[]
  totalStars: number
  lastActiveAt: string | null
  pinned: GithubPinned[]
}

export interface Links {
  linkedin?: string
  website?: string
  portfolio?: string
  twitter?: string
  github?: string
  behance?: string
  dribbble?: string
  other?: string[]
}

// Merged enrichment payload (mirrors the Prisma JSON columns).
export interface EnrichmentMerged {
  profile?: NormalizedProfile
  company?: CompanyContext
  github?: GithubData
  links?: Links
  summary?: string
}

export interface EnrichCandidate {
  id: string
  name: string
  email: string
  phone: string | null
  currentTitle: string | null
  currentCompany: string | null
  linkedinUrl: string | null
  resumeUrl: string | null
  resumeText: string | null
  skills: string[] | null
  jobTitle: string | null
  jobDescription: string | null
}

export interface EnrichInput {
  candidate: EnrichCandidate
  roleFamily: RoleFamily
  acc: EnrichmentMerged   // accumulated results from providers that already ran
}

export type ProviderStatus = 'ok' | 'partial' | 'skipped' | 'failed'

export interface ProviderResult {
  status: ProviderStatus
  source?: string         // human label for attribution, e.g. "GitHub public API"
  data: EnrichmentMerged  // partial contribution
}

export interface EnrichmentProvider {
  key: 'resume' | 'links' | 'company' | 'github' | 'websummary'
  universal: boolean
  relevantFor?: RoleFamily[]
  // Optional dynamic gate (e.g. GitHub runs when a handle is derivable even for
  // a non-engineering candidate). Universal/relevantFor still apply.
  shouldRun?(input: EnrichInput): boolean
  enrich(input: EnrichInput): Promise<ProviderResult>
}
