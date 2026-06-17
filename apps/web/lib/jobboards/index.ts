// ── Multi-board job distribution: connector interface + registry (Build 1) ──
// Adding a new board later = one new connector file + a registry entry. No
// schema change required.

export type PostingStatus = 'posted' | 'manual_pending' | 'failed' | 'expired'

// Normalized job shape passed to connectors (decoupled from Prisma types).
export interface JobForPosting {
  id: string
  title: string
  description: string
  department: string | null
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  companyName: string | null
  applyUrl: string
}

export interface PostResult {
  status: PostingStatus
  externalId?: string
  externalUrl?: string
  error?: string
  // For assisted mode: a ready-to-paste payload the recruiter copies into the
  // board. Not persisted — surfaced in the POST response for the UI.
  payload?: string
}

// ── Inbound sourcing (Sourcing Hub v1) ─────────────────────────────────────
// A normalized applicant a board would send us. Connectors that can pull
// candidates implement `pull`; the import pipeline dedupes + scores them.
export interface InboundCandidate {
  name: string
  email: string | null
  phone?: string | null
  title?: string | null
  resumeText?: string | null
}

export interface BoardConnector {
  board: string
  label: string
  tier: 'A' | 'B'
  mode: 'api' | 'assisted'
  comingSoon?: boolean
  post(job: JobForPosting, creds?: Record<string, unknown>): Promise<PostResult>
  expire?(externalId: string, creds?: Record<string, unknown>): Promise<void>
  // Inbound source capability. 'live' once a real board API is wired;
  // 'scaffold' returns a representative sample feed for v1; omit when the board
  // has no inbound yet.
  inbound?: 'live' | 'scaffold'
  pull?(creds?: Record<string, unknown>): Promise<InboundCandidate[]>
}

// Shared sample feed for boards whose inbound is still scaffolded (no live API
// credentials yet). Deterministic per board so demos/tests are stable. Swap a
// connector's `pull` for a real API call to graduate it to inbound: 'live'.
export function sampleInboundCandidates(board: string, label: string): InboundCandidate[] {
  const seed = [
    { first: 'Aarav', last: 'Sharma', title: 'Senior Backend Engineer', skills: 'Node.js, PostgreSQL, AWS, microservices' },
    { first: 'Diya', last: 'Menon', title: 'Full-Stack Developer', skills: 'React, TypeScript, Next.js, GraphQL' },
  ]
  return seed.map((s) => ({
    name: `${s.first} ${s.last}`,
    email: `${s.first}.${s.last}.${board}@example.com`.toLowerCase(),
    phone: null,
    title: s.title,
    resumeText: `${s.first} ${s.last} — ${s.title}. Skills: ${s.skills}. Sourced via ${label}.`,
  }))
}

// Shared helper: format a job into clean text recruiters can paste anywhere.
export function buildJobPayload(job: JobForPosting): string {
  const lines: string[] = []
  lines.push(job.title)
  const meta = [job.companyName, job.department, job.location].filter(Boolean).join(' · ')
  if (meta) lines.push(meta)
  if (job.salaryMin || job.salaryMax) {
    const fmt = (n: number) => `₹${(n / 100000).toFixed(1)}L`
    lines.push(`Compensation: ${job.salaryMin ? fmt(job.salaryMin) : '–'} – ${job.salaryMax ? fmt(job.salaryMax) : '–'} per annum`)
  }
  lines.push('', job.description, '', `Apply here: ${job.applyUrl}`)
  return lines.join('\n')
}

import { linkedinConnector } from './connectors/linkedin'
import { indeedConnector } from './connectors/indeed'
import { naukriConnector } from './connectors/naukri'
import { ziprecruiterConnector } from './connectors/ziprecruiter'
import { monsterConnector } from './connectors/monster'
import { customConnector } from './connectors/custom'

// Registry — order defines display order in the UI.
const REGISTRY: BoardConnector[] = [
  linkedinConnector,
  indeedConnector,
  naukriConnector,
  ziprecruiterConnector,
  monsterConnector,
  customConnector,
]

const BY_BOARD = new Map(REGISTRY.map((c) => [c.board, c]))

export function getConnector(board: string): BoardConnector | undefined {
  return BY_BOARD.get(board)
}

export function listBoards(): { board: string; label: string; tier: 'A' | 'B'; mode: 'api' | 'assisted'; comingSoon: boolean; inbound: 'live' | 'scaffold' | null }[] {
  return REGISTRY.map((c) => ({ board: c.board, label: c.label, tier: c.tier, mode: c.mode, comingSoon: !!c.comingSoon, inbound: c.inbound ?? null }))
}
