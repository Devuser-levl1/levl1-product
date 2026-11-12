// ── Tech-term glossary (Screen-scoped, isomorphic) ─────────────────────────
// One source of truth for technical vocabulary, used by:
//   • resume ↔ role fit      canonicalSkill(), findSkills()       (Fixpack 8 #4)
//   • Scribe STT keyterms    sttKeyterms()                          (#5)
//   • STT transcript fix-up  normalizeSpokenTech()  "c sharp" → C#  (#5)
//   • TTS pronunciation      speakableTech()        C# → "C sharp"  (#5)
// Add a term once here and every layer picks it up.

export interface TechTerm {
  canon: string          // how it is written (and shown) — also the STT keyterm
  aliases?: string[]     // other WRITTEN forms that mean the same skill
  spoken?: string        // how TTS should say it (omit when the canon reads fine)
  heard?: string[]       // how STT tends to transcribe it when spoken (lower-case)
}

export const TECH_TERMS: TechTerm[] = [
  // Languages
  { canon: 'C#', aliases: ['csharp', 'c sharp', 'c#.net'], spoken: 'C sharp', heard: ['c sharp', 'see sharp', 'c-sharp', 'csharp'] },
  { canon: 'C++', aliases: ['cpp', 'c plus plus'], spoken: 'C plus plus', heard: ['c plus plus', 'see plus plus', 'c++'] },
  { canon: 'C' },
  { canon: 'F#', aliases: ['fsharp'], spoken: 'F sharp', heard: ['f sharp'] },
  { canon: 'Java' }, { canon: 'Kotlin' }, { canon: 'Scala' }, { canon: 'Swift' }, { canon: 'Rust' },
  { canon: 'Go', aliases: ['golang'], heard: ['golang'] },
  { canon: 'Python' }, { canon: 'Ruby' }, { canon: 'PHP' }, { canon: 'Perl' }, { canon: 'R' },
  { canon: 'JavaScript', aliases: ['js', 'ecmascript'], heard: ['java script'] },
  { canon: 'TypeScript', aliases: ['ts'], heard: ['type script'] },
  { canon: 'SQL', aliases: ['t-sql', 'tsql', 'pl/sql', 'plsql'], heard: ['sequel', 's q l'] },
  { canon: 'Bash', aliases: ['shell scripting', 'shell'] }, { canon: 'PowerShell' },
  // .NET family
  { canon: '.NET', aliases: ['dotnet', 'dot net', '.net core', '.net framework', 'net core'], spoken: 'dot net', heard: ['dot net', 'dotnet', 'dot-net'] },
  { canon: 'ASP.NET', aliases: ['asp.net core', 'asp.net mvc', 'aspnet', 'asp net'], spoken: 'A S P dot net', heard: ['asp dot net', 'a s p dot net'] },
  { canon: 'Entity Framework', aliases: ['ef core', 'entity framework core'] },
  { canon: 'LINQ', spoken: 'link', heard: ['link'] },
  { canon: 'Blazor' }, { canon: 'WPF' }, { canon: 'WCF' },
  // Front end
  { canon: 'React', aliases: ['react.js', 'reactjs'] }, { canon: 'Next.js', aliases: ['nextjs'], spoken: 'Next J S', heard: ['next js', 'next dot js'] },
  { canon: 'Angular', aliases: ['angularjs'] }, { canon: 'Vue', aliases: ['vue.js', 'vuejs'] }, { canon: 'Svelte' },
  { canon: 'Node.js', aliases: ['node', 'nodejs'], spoken: 'Node J S', heard: ['node js', 'node dot js'] },
  { canon: 'Express', aliases: ['express.js'] }, { canon: 'HTML'  }, { canon: 'CSS' },
  { canon: 'Redux' }, { canon: 'Tailwind', aliases: ['tailwindcss', 'tailwind css'] },
  // Back end frameworks
  { canon: 'Spring Boot', aliases: ['spring', 'spring framework'] }, { canon: 'Django' }, { canon: 'Flask' }, { canon: 'FastAPI', spoken: 'Fast A P I', heard: ['fast api'] },
  { canon: 'Rails', aliases: ['ruby on rails', 'ror'] }, { canon: 'Laravel' },
  { canon: 'GraphQL', spoken: 'Graph Q L', heard: ['graph ql', 'graph q l'] }, { canon: 'REST', aliases: ['rest api', 'restful', 'rest apis'] },
  { canon: 'gRPC', spoken: 'G R P C', heard: ['g rpc', 'grpc'] }, { canon: 'Microservices', aliases: ['microservice', 'micro services'] },
  // Data stores
  { canon: 'PostgreSQL', aliases: ['postgres', 'psql'], spoken: 'Postgres', heard: ['postgres', 'postgre sql', 'post gres'] },
  { canon: 'MySQL', spoken: 'My S Q L', heard: ['my sql', 'my sequel'] },
  { canon: 'SQL Server', aliases: ['mssql', 'ms sql', 'microsoft sql server'], heard: ['sequel server'] },
  { canon: 'Oracle' }, { canon: 'MongoDB', aliases: ['mongo'], heard: ['mongo db'] }, { canon: 'Redis' },
  { canon: 'Cassandra' }, { canon: 'DynamoDB', heard: ['dynamo db'] }, { canon: 'Elasticsearch', aliases: ['elastic search', 'elk'] },
  { canon: 'Kafka', aliases: ['apache kafka'] }, { canon: 'RabbitMQ', heard: ['rabbit mq'] },
  { canon: 'Snowflake' }, { canon: 'BigQuery', heard: ['big query'] }, { canon: 'Spark', aliases: ['pyspark', 'apache spark'] },
  { canon: 'Airflow' }, { canon: 'dbt' }, { canon: 'Hadoop' }, { canon: 'Pandas' },
  // Cloud / DevOps
  { canon: 'AWS', aliases: ['amazon web services'] }, { canon: 'Azure', aliases: ['microsoft azure'] },
  { canon: 'GCP', aliases: ['google cloud', 'google cloud platform'] },
  { canon: 'Kubernetes', aliases: ['k8s'], spoken: 'Kubernetes', heard: ['cooper netties', 'kuber netes', 'k8s'] },
  { canon: 'Docker' }, { canon: 'Terraform' }, { canon: 'Ansible' }, { canon: 'Jenkins' },
  { canon: 'CI/CD', aliases: ['cicd', 'ci cd', 'continuous integration'], spoken: 'C I C D', heard: ['ci cd', 'c i c d'] },
  { canon: 'GitHub Actions' }, { canon: 'Git' }, { canon: 'Linux' }, { canon: 'Nginx', spoken: 'engine X', heard: ['engine x'] },
  { canon: 'Prometheus' }, { canon: 'Grafana' },
  // Mobile
  { canon: 'Android' }, { canon: 'iOS' }, { canon: 'React Native' }, { canon: 'Flutter' }, { canon: 'Dart' }, { canon: 'SwiftUI' },
  // ML
  { canon: 'TensorFlow' }, { canon: 'PyTorch', heard: ['pie torch', 'py torch'] }, { canon: 'scikit-learn', aliases: ['sklearn', 'scikit learn'] },
  { canon: 'LLM', aliases: ['llms', 'large language models'] }, { canon: 'NLP' },
  // Testing
  { canon: 'xUnit' }, { canon: 'NUnit' }, { canon: 'JUnit' }, { canon: 'Jest' }, { canon: 'Selenium' }, { canon: 'Cypress' }, { canon: 'Playwright' },
  // Concepts often probed
  { canon: 'OOP', aliases: ['object oriented programming', 'object-oriented'] },
  { canon: 'SOLID' }, { canon: 'API', aliases: ['apis'] }, { canon: 'JSON' },
  { canon: 'JWT' }, { canon: 'OAuth', spoken: 'oh auth' }, { canon: 'async/await', aliases: ['async await'], spoken: 'async await' },
]

/* ── matching helpers ─────────────────────────────────────────────────────── */

// Keep + # . / so C#, C++, .NET, CI/CD survive; everything else is a separator.
export const normTerm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#./]+/g, ' ').replace(/\s+/g, ' ').trim()

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Word-ish boundary regex that works for symbol-bearing terms (C#, C++, .NET). */
function termRegex(form: string): RegExp {
  // Left boundary: not preceded by a letter/digit or '.' (so ".net" inside "asp.net" isn't a separate .NET hit
  // — ASP.NET maps to .NET separately via aliases). Right boundary: not followed by a letter/digit/+/#.
  return new RegExp(`(?<![a-z0-9.])${escapeRe(form)}(?![a-z0-9+#])`, 'i')
}

interface Indexed { term: TechTerm; forms: { form: string; re: RegExp }[] }
const INDEX: Indexed[] = TECH_TERMS.map((term) => {
  const forms = Array.from(new Set([term.canon, ...(term.aliases ?? [])].map(normTerm))).filter(Boolean)
  return { term, forms: forms.map((form) => ({ form, re: termRegex(form) })) }
})
const BY_FORM = new Map<string, TechTerm>()
for (const { term, forms } of INDEX) for (const { form } of forms) if (!BY_FORM.has(form)) BY_FORM.set(form, term)

// Single-letter / ambiguous canon forms are only matched as a whole skill
// entry, never searched for inside free text (the letter "R" or "C" or "Go").
const NO_TEXT_SEARCH = new Set(['c', 'r', 'go', 'rest', 'spring', 'shell', 'node', 'oracle', 'swift', 'express', 'git', 'ts', 'js', 'dart', 'spark', 'elk', 'api', 'apis'])

/** Canonical name for a skill string ("dotnet core" → ".NET"); null if unknown. */
export function canonicalSkill(raw: string): string | null {
  const n = normTerm(raw)
  if (!n) return null
  const direct = BY_FORM.get(n)
  if (direct) return direct.canon
  // Short phrases like ".NET Core 6" or "C# 10" → the first glossary term they contain.
  if (n.split(' ').length <= 4) {
    for (const { term, forms } of INDEX) {
      if (forms.some((f) => !NO_TEXT_SEARCH.has(f.form) && f.re.test(n))) return term.canon
    }
  }
  return null
}

/** Every glossary skill mentioned in free text, with mention counts. */
export function findSkills(text: string): Map<string, number> {
  const out = new Map<string, number>()
  const t = ` ${normTerm(text)} `
  for (const { term, forms } of INDEX) {
    let count = 0
    for (const f of forms) {
      if (NO_TEXT_SEARCH.has(f.form)) continue
      const g = new RegExp(f.re.source, 'gi')
      count += (t.match(g) ?? []).length
    }
    if (count) out.set(term.canon, count)
  }
  return out
}

/* ── STT ──────────────────────────────────────────────────────────────────── */

// Always-on technical keyterms (beyond the position's own skills).
const BASE_STT_TERMS = ['C#', 'C++', '.NET', 'ASP.NET', 'SQL', 'PostgreSQL', 'Kubernetes', 'Kafka', 'Redis', 'GraphQL', 'TypeScript', 'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Docker', 'AWS', 'Azure', 'microservices', 'API', 'CI/CD', 'LINQ', 'async/await', 'idempotent', 'latency', 'concurrency']
// Scribe realtime limits (documented): ≤50 keyterms, each ≤20 characters.
// Longer terms are DROPPED, not truncated (a cut-off term would bias wrongly).
export const MAX_STT_KEYTERMS = 50
export const MAX_KEYTERM_LEN = 20

/** Keyterm list for Scribe: control words + position skills (canonical) + base glossary, de-duplicated and capped. */
export function sttKeyterms(controlWords: string[], positionSkills: string[] = []): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (k: string) => {
    const s = k.trim()
    if (!s || s.length > MAX_KEYTERM_LEN || seen.has(s.toLowerCase()) || out.length >= MAX_STT_KEYTERMS) return
    seen.add(s.toLowerCase()); out.push(s)
  }
  controlWords.forEach(push)
  for (const raw of positionSkills) {
    const c = canonicalSkill(raw)
    push(c ?? raw)
    // Spoken-forms help the model when the canon is symbolic (C# ↔ "C sharp").
    const t = c ? TECH_TERMS.find((x) => x.canon === c) : undefined
    if (t?.spoken && /[^a-z0-9 ]/i.test(t.canon)) push(t.spoken)
  }
  BASE_STT_TERMS.forEach(push)
  return out
}

// Spoken → written. Only phrases that are unambiguous in an interview; bare
// "CI" is NOT rewritten (CI/CD is a real term) — keyterms bias the model instead.
const HEARD: { re: RegExp; canon: string }[] = TECH_TERMS
  .flatMap((t) => (t.heard ?? []).filter((h) => /\s|-/.test(h) || h !== normTerm(t.canon)).map((h) => ({ h, canon: t.canon })))
  .sort((a, b) => b.h.length - a.h.length)
  .map(({ h, canon }) => ({ re: new RegExp(`(?<![A-Za-z0-9])${h.split(/[\s-]+/).map(escapeRe).join('[\\s-]+')}(?![A-Za-z0-9])`, 'gi'), canon }))

/** Fix common STT spellings of tech terms ("see sharp" → "C#"). Display + scoring text. */
export function normalizeSpokenTech(text: string): string {
  let out = text
  for (const { re, canon } of HEARD) out = out.replace(re, canon)
  return out
}

/* ── TTS ──────────────────────────────────────────────────────────────────── */

const SPEAK: { re: RegExp; spoken: string }[] = TECH_TERMS
  .filter((t) => t.spoken && t.spoken !== t.canon)
  .flatMap((t) => [t.canon, ...(t.aliases ?? []).filter((a) => /[#+./]/.test(a))].map((form) => ({ form, spoken: t.spoken as string })))
  .filter(({ form }) => form.length > 1)          // never rewrite single letters
  .sort((a, b) => b.form.length - a.form.length)  // ASP.NET before .NET, C++ before C
  .map(({ form, spoken }) => ({
    // Case-sensitive for all-caps acronyms so ordinary words aren't touched ("rest", "link").
    re: new RegExp(`(?<![A-Za-z0-9.])${escapeRe(form)}(?![A-Za-z0-9+#])`, /^[A-Z/]+$/.test(form) ? 'g' : 'gi'),
    spoken,
  }))

/** Rewrite tech terms into how the interviewer should pronounce them. */
export function speakableTech(text: string): string {
  let out = text
  for (const { re, spoken } of SPEAK) out = out.replace(re, spoken)
  return out
}
