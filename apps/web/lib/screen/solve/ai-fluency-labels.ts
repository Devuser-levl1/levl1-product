// ── AI-fluency dimensions (Screen-scoped, isomorphic — safe for client components) ──
export const FLUENCY_DIMENSIONS = ['decomposition', 'prompting', 'verification', 'critique', 'ownership'] as const
export type FluencyDimension = (typeof FLUENCY_DIMENSIONS)[number]
export const FLUENCY_LABEL: Record<FluencyDimension, string> = {
  decomposition: 'Problem decomposition', prompting: 'Prompting', verification: 'Verification', critique: 'Critique of AI output', ownership: 'Ownership',
}
export type FluencyRating = 'strong' | 'adequate' | 'weak' | 'not_evidenced'
