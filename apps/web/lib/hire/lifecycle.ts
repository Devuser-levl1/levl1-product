// Client-safe candidate-lifecycle constants (no server imports — safe to use in
// both API routes and React client components).

// Canonical reject reasons offered in the UI; free text is also allowed.
export const REJECT_REASONS = [
  'Did not clear interview',
  'Did not attend',
  'Skills mismatch',
  'Withdrew',
  'Position filled',
] as const

// Canonical delete reasons offered in the UI; free text is also allowed.
export const DELETE_REASONS = [
  'Duplicate record',
  'Spam / invalid',
  'Added in error',
  'Candidate requested removal',
  'Data cleanup',
] as const

export const REJECTED_STAGE = 'Rejected'
