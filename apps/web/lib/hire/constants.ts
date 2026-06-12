export const CANDIDATE_SOURCES = [
  'LinkedIn',
  'Naukri',
  'Indeed',
  'Referral',
  'Career Page',
  'Bulk Import',
  'Manual',
  'Other',
] as const

export const INDUSTRIES = [
  'Banking & Financial Services',
  'Technology',
  'Healthcare',
  'Manufacturing',
  'Retail & E-commerce',
  'Consulting',
  'Real Estate',
  'Education',
  'Logistics & Supply Chain',
  'Media & Entertainment',
  'Other',
] as const

export const DEAL_STAGES = [
  'Discovery',
  'Proposal',
  'Negotiation',
  'Verbal Commit',
  'Closed Won',
  'Closed Lost',
] as const

export const STAGE_PROBABILITY: Record<string, number> = {
  Discovery: 10,
  Proposal: 30,
  Negotiation: 60,
  'Verbal Commit': 80,
  'Closed Won': 100,
  'Closed Lost': 0,
}
