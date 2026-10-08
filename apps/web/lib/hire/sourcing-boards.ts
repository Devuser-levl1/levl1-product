// Per-board sourcing registry for the compliant, recruiter-driven model.
// Each board contributes: a search-string key (matches the AI search-string
// generator's board keys), a deep link that opens THAT board's own search
// pre-filled with the generated query, and the host its profile pages live on
// (so the browser extension knows where capture works). Adding a board later =
// one entry here + the extension page-matcher for its profile pages.

export interface SourcingBoard {
  key: string            // matches search-strings generator board key
  label: string
  // Build a deep link to the board's candidate/people search, pre-filled.
  searchUrl: (query: string, location?: string) => string
  // Where the recruiter captures profiles (shown as guidance; the extension
  // content-script matches these hosts).
  captureHint: string
  // Whether the Levl1 extension can capture profiles on this board yet.
  captureReady: boolean
}

const enc = (s: string) => encodeURIComponent(s)

export const SOURCING_BOARDS: SourcingBoard[] = [
  {
    key: 'indeed',
    label: 'Indeed',
    // Indeed Resume / Smart Sourcing candidate search (employer login).
    searchUrl: (q, loc) => `https://resumes.indeed.com/search?q=${enc(q)}${loc ? `&l=${enc(loc)}` : ''}`,
    captureHint: 'Indeed résumé / candidate profile pages (resumes.indeed.com)',
    captureReady: true,
  },
  {
    key: 'naukri',
    label: 'Naukri',
    // Naukri Resdex keyword search (recruiter login).
    searchUrl: (q, loc) => `https://resdex.naukri.com/v3/search?keyword=${enc(q)}${loc ? `&location=${enc(loc)}` : ''}`,
    captureHint: 'Naukri Resdex profile pages',
    captureReady: false,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    searchUrl: (q, loc) => `https://www.linkedin.com/search/results/people/?keywords=${enc(q)}${loc ? `&origin=FACETED_SEARCH` : ''}`,
    captureHint: 'LinkedIn profile pages (linkedin.com/in/…)',
    captureReady: true,
  },
]

export function getSourcingBoard(key: string): SourcingBoard | null {
  return SOURCING_BOARDS.find((b) => b.key === key) ?? null
}
