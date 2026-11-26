import type { CandidatePortalData } from '@/lib/candidatePortal'

// Where a candidate page should send someone whose interview isn't in a
// bookable / joinable state (shared by the schedule and join pages).
export const LIVE_ELSEWHERE_MESSAGE = 'Your interview is already open in another window or on another device. If you closed it, wait two minutes and open this link again.'

export function candidateDetour(data: CandidatePortalData): string | null {
  const q = data.linkKey ? `?k=${encodeURIComponent(data.linkKey)}` : ''
  switch (data.recovery) {
    case 'interrupted':
    case 'terminated': return `/candidate/recover/${data.interviewId}${q}`
    case 'live': return `/candidate/error?message=${encodeURIComponent(LIVE_ELSEWHERE_MESSAGE)}`
    case 'completed':
    case 'withdrawn': return `/candidate/error?message=${encodeURIComponent('This interview has already been completed.')}`
    default: return null
  }
}
