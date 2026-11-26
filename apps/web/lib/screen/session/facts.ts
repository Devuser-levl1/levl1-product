// ── Candidate facts: the interview's running memory (Screen-scoped, isomorphic) ─
// Real-user bug: the interviewer asked the candidate's location, then a few
// questions later asked "can you relocate to <the same city>?". The earlier fix
// only stopped the LOGISTICS segment re-asking its own topic; nothing held the
// facts the candidate had already stated, and recruiter knockout questions
// ("Are you willing to relocate to X?") were read verbatim regardless.
//
// Now every question-asking step (warm-up → logistics → Q&A brain) reads and
// updates ONE structured facts record, and code — not just the prompt — guards
// against asking for something already known:
//   • relocation is only asked if the role has a location AND the candidate's
//     known location doesn't already satisfy it (city aliases understood)
//   • a hiring-team question already answered by a known fact is skipped and
//     acknowledged ("You're already in Pune, so relocation isn't a concern")
//   • every prompt carries KNOWN FACTS + "never ask for anything in it"

export type Relocation = 'yes' | 'no' | 'conditional'

export interface CandidateFacts {
  location?: string            // city / region they're based in
  workMode?: string            // onsite | hybrid | remote | flexible (what they want)
  relocation?: Relocation
  noticePeriod?: string        // as said, e.g. "60 days", "immediate"
  earliestStart?: string
  yearsExperience?: number
  currentRole?: string
  currentCompany?: string
  workAuth?: string            // authorized | needs sponsorship | … (status only)
}

const FIELDS: (keyof CandidateFacts)[] = ['location', 'workMode', 'relocation', 'noticePeriod', 'earliestStart', 'yearsExperience', 'currentRole', 'currentCompany', 'workAuth']

const str = (v: unknown, n = 80) => (typeof v === 'string' && v.trim() && !/^(null|none|unknown|n\/?a|not (stated|given|mentioned))$/i.test(v.trim()) ? v.replace(/\s+/g, ' ').trim().slice(0, n) : undefined)

/** Untrusted (model / browser) → clean facts. Unknown keys and empty values dropped. */
export function sanitizeFacts(raw: unknown): CandidateFacts {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const f: CandidateFacts = {}
  const loc = str(o.location); if (loc) f.location = loc
  const wm = str(o.workMode, 20)?.toLowerCase(); if (wm && /^(onsite|on-site|hybrid|remote|flexible)$/.test(wm)) f.workMode = wm.replace('on-site', 'onsite')
  const rel = str(o.relocation, 20)?.toLowerCase(); if (rel === 'yes' || rel === 'no' || rel === 'conditional') f.relocation = rel
  const np = str(o.noticePeriod, 60); if (np) f.noticePeriod = np
  const es = str(o.earliestStart, 60); if (es) f.earliestStart = es
  // Number(null) is 0 — only a real number (or a numeric string like "4" / "4.5 years") counts.
  const yr = o.yearsExperience
  const y = typeof yr === 'number' ? yr : typeof yr === 'string' && /^\s*\d+(\.\d+)?/.test(yr) ? parseFloat(yr) : NaN
  if (Number.isFinite(y) && y >= 0 && y <= 60) f.yearsExperience = Math.round(y * 10) / 10
  const cr = str(o.currentRole); if (cr) f.currentRole = cr
  const cc = str(o.currentCompany); if (cc) f.currentCompany = cc
  const wa = str(o.workAuth, 40); if (wa) f.workAuth = wa
  return f
}

/** Later statements win; nothing known is ever dropped by an update that omits it. */
export function mergeFacts(prev: CandidateFacts, next: CandidateFacts): CandidateFacts {
  const out: CandidateFacts = { ...prev }
  for (const k of FIELDS) if (next[k] !== undefined) (out as Record<string, unknown>)[k] = next[k]
  return out
}

export const hasFacts = (f: CandidateFacts) => FIELDS.some((k) => f[k] !== undefined)

/** Prompt block: what the candidate has ALREADY told us. */
export function factsBlock(f: CandidateFacts): string {
  const lines = [
    f.location && `- Based in: ${f.location}`,
    f.workMode && `- Preferred work mode: ${f.workMode}`,
    f.relocation && `- Willing to relocate: ${f.relocation}`,
    f.noticePeriod && `- Notice period: ${f.noticePeriod}`,
    f.earliestStart && `- Earliest start: ${f.earliestStart}`,
    f.yearsExperience !== undefined && `- Years of experience: ${f.yearsExperience}`,
    f.currentRole && `- Current role: ${f.currentRole}`,
    f.currentCompany && `- Current company: ${f.currentCompany}`,
    f.workAuth && `- Work authorization: ${f.workAuth}`,
  ].filter(Boolean)
  return lines.length
    ? `KNOWN FACTS (the candidate already told you these — NEVER ask for any of them again, in any wording; reconcile every question you intend to ask against this list first, and if it's already answered, skip it or acknowledge it briefly instead):\n${lines.join('\n')}`
    : 'KNOWN FACTS: none yet.'
}

/** JSON shape the models fill to report newly stated facts. */
export const FACTS_JSON_HINT = '{"location":null,"workMode":null,"relocation":null,"noticePeriod":null,"earliestStart":null,"yearsExperience":null,"currentRole":null,"currentCompany":null,"workAuth":null}'

// ── City matching ───────────────────────────────────────────────────────────
// "Bangalore" must satisfy "Bengaluru, India"; "Gurgaon" must satisfy "Gurugram".
const ALIASES: string[][] = [
  ['bengaluru', 'bangalore', 'blr'], ['mumbai', 'bombay', 'navi mumbai'], ['chennai', 'madras'], ['kolkata', 'calcutta'],
  ['gurugram', 'gurgaon'], ['delhi', 'new delhi', 'ncr', 'delhi ncr'], ['noida', 'greater noida'], ['pune', 'poona'],
  ['thiruvananthapuram', 'trivandrum'], ['kochi', 'cochin'], ['mysuru', 'mysore'], ['vadodara', 'baroda'], ['puducherry', 'pondicherry'],
  ['hyderabad', 'secunderabad', 'cyberabad'], ['visakhapatnam', 'vizag'], ['new york', 'nyc'], ['san francisco', 'sf', 'bay area'],
]
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
const canon = (token: string) => ALIASES.find((g) => g.includes(token))?.[0] ?? token

function places(s: string): Set<string> {
  const n = norm(s)
  const out = new Set<string>()
  for (const g of ALIASES) for (const a of g) if (new RegExp(`\\b${a}\\b`).test(n)) out.add(g[0])
  // Fall back to each comma-separated part (e.g. "Austin, TX" → "austin").
  for (const part of s.split(/[,/|-]/)) { const p = norm(part); if (p.length >= 3) out.add(canon(p)) }
  return out
}

/** Is the candidate's known location the job's location? (null = can't tell) */
export function sameLocation(jobLocation: string | undefined, candidateLocation: string | undefined): boolean | null {
  if (!jobLocation || !candidateLocation) return null
  const job = places(jobLocation)
  const cand = places(candidateLocation)
  for (const p of Array.from(cand)) if (job.has(p)) return true
  return false
}

const RELOCATION_Q = /\brelocat|\bmove to\b|\bshift to\b|\bbased (in|out of)\b|\bwork from (our|the) .* office|\bwilling to (work|be) (in|from)\b|\bcommute\b/i
const NOTICE_Q = /\bnotice\b|\bjoin(ing)?\b|\bstart date\b|\bwhen can you start\b|\bearliest\b/i
const EXPERIENCE_Q = /\byears? of experience\b|\bhow many years\b|\bexperience (in|with)\b.*\byears?\b/i
const WORKAUTH_Q = /\bauthori[sz]ed\b|\bsponsor|\bvisa\b|\bright to work\b/i

/** Does this line ask for relocation? */
export const asksRelocation = (line: string) => RELOCATION_Q.test(line)

/**
 * Can a hiring-team (knockout) question be answered from facts already given?
 * Returns the recorded answer + a spoken acknowledgement, or null to ask it.
 * Only skips when the fact UNAMBIGUOUSLY answers it.
 */
export function knockoutAnsweredByFacts(question: string, facts: CandidateFacts, jobLocation?: string): { answer: string; ack: string } | null {
  if (RELOCATION_Q.test(question)) {
    const loc = jobLocation ?? question
    if (facts.location && sameLocation(loc, facts.location)) {
      return { answer: `Already based in ${facts.location} (stated earlier)`, ack: `You're already in ${facts.location}, so relocation isn't a concern.` }
    }
    if (facts.relocation === 'yes') return { answer: 'Willing to relocate (stated earlier)', ack: `You mentioned you're open to relocating, so I've noted that.` }
    return null
  }
  if (NOTICE_Q.test(question) && facts.noticePeriod) return { answer: `Notice period: ${facts.noticePeriod} (stated earlier)`, ack: `I've already noted your notice period.` }
  if (EXPERIENCE_Q.test(question) && facts.yearsExperience !== undefined) return { answer: `${facts.yearsExperience} years of experience (stated earlier)`, ack: `I've noted your experience from earlier.` }
  if (WORKAUTH_Q.test(question) && facts.workAuth) return { answer: `Work authorization: ${facts.workAuth} (stated earlier)`, ack: `I've already noted your work authorization.` }
  return null
}

// ── Location stated in passing (warm-up "calling from Pune") ────────────────
// Deterministic so the logistics opener can skip "where are you based?" with
// no model call. Conservative: a known city alias, or a capitalised place
// right after "based in / calling from / joining from / live in".
const STOP = new Set(['I', 'The', 'A', 'My', 'Our', 'Home', 'Office', 'Work', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'India', 'Today', 'Here', 'There', 'Bed', 'Morning', 'Evening'])
export function locationFromText(text: string): string | undefined {
  const n = norm(text)
  for (const g of ALIASES) for (const a of g) if (a.length > 3 && new RegExp(`\\b(in|from|at|near|around)\\s+${a}\\b`).test(n)) {
    const m = new RegExp(`\\b(${a})\\b`, 'i').exec(text)
    return m ? m[1].replace(/^./, (c) => c.toUpperCase()) : g[0]
  }
  const m = /\b(?:based (?:in|out of)|calling from|joining from|dialing in from|live in|living in|staying in|located in)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/.exec(text)
  if (m && !STOP.has(m[1].split(' ')[0])) return m[1]
  return undefined
}
