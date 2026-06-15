import { RoleFamily } from './types'

// Infer a COARSE role family from the job + resume. Used only to ORDER/EMPHASISE
// signals in the UI — never to skip universal providers. Keyword-based and cheap
// (no AI call); defaults to 'generalist' when nothing matches.
const FAMILIES: { family: RoleFamily; keywords: string[] }[] = [
  { family: 'engineering', keywords: ['engineer', 'developer', 'software', 'sde', 'devops', 'data scientist', 'ml ', 'machine learning', 'backend', 'frontend', 'full stack', 'fullstack', 'programmer', 'architect', 'qa', 'sre', 'mobile', 'android', 'ios'] },
  { family: 'sales', keywords: ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'account manager', 'inside sales', 'territory', 'quota', 'revenue'] },
  { family: 'finance', keywords: ['finance', 'accountant', 'accounting', 'controller', 'cfo', 'fp&a', 'audit', 'tax', 'treasury', 'investment', 'analyst, finance', 'bookkeeper', 'ca '] },
  { family: 'marketing', keywords: ['marketing', 'growth', 'seo', 'content', 'brand', 'social media', 'demand gen', 'campaign', 'communications', 'pr ', 'copywriter'] },
  { family: 'operations', keywords: ['operations', 'ops', 'supply chain', 'logistics', 'procurement', 'project manager', 'program manager', 'process', 'admin', 'coordinator'] },
  { family: 'healthcare', keywords: ['nurse', 'physician', 'doctor', 'medical', 'clinical', 'healthcare', 'pharma', 'pharmacist', 'therapist', 'radiolog', 'patient care', 'rn '] },
]

export function inferRoleFamily(parts: { jobTitle?: string | null; jobDescription?: string | null; candidateTitle?: string | null; resumeText?: string | null }): RoleFamily {
  // Weight the job title/description most; fall back to the candidate's title.
  const haystack = [
    parts.jobTitle, parts.jobTitle, // double-weight by duplicating
    parts.candidateTitle,
    (parts.jobDescription ?? '').slice(0, 1500),
    (parts.resumeText ?? '').slice(0, 800),
  ].filter(Boolean).join(' \n ').toLowerCase()

  if (!haystack.trim()) return 'generalist'

  let best: { family: RoleFamily; score: number } = { family: 'generalist', score: 0 }
  for (const { family, keywords } of FAMILIES) {
    let score = 0
    for (const kw of keywords) if (haystack.includes(kw)) score++
    if (score > best.score) best = { family, score }
  }
  return best.score > 0 ? best.family : 'generalist'
}
