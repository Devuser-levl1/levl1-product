// Pure (no server deps) submission-column catalog — safe to import from client
// components. lib/hire/submission.ts (exceljs) re-exports these for server use.

export interface SubmissionColumn { key: string; label: string }

export const SUBMISSION_COLUMN_CATALOG: SubmissionColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'currentTitle', label: 'Current Title' },
  { key: 'currentCompany', label: 'Current Company' },
  { key: 'experience', label: 'Experience' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'skills', label: 'Key Skills' },
  { key: 'matchScore', label: 'Match Score' },
  { key: 'recommendation', label: 'AI Recommendation' },
  { key: 'source', label: 'Source' },
  { key: 'stage', label: 'Pipeline Stage' },
  { key: 'summary', label: 'Recruiter / AI Notes' },
]

export const DEFAULT_SUBMISSION_COLUMNS = ['name', 'currentTitle', 'experience', 'skills', 'matchScore', 'summary']

const CATALOG_KEYS = new Set(SUBMISSION_COLUMN_CATALOG.map((c) => c.key))
const LABEL = new Map(SUBMISSION_COLUMN_CATALOG.map((c) => [c.key, c.label]))

/** Validate + normalize a stored/override column list to known keys (order kept). */
export function resolveColumns(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string' && CATALOG_KEYS.has(k)) : []
  const seen = new Set<string>()
  const out = list.filter((k) => (seen.has(k) ? false : (seen.add(k), true)))
  return out.length ? out : [...DEFAULT_SUBMISSION_COLUMNS]
}

export function columnLabel(key: string): string { return LABEL.get(key) ?? key }
