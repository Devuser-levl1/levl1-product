import { BoardConnector, JobForPosting, PostResult, InboundCandidate, buildJobPayload, sampleInboundCandidates } from '../index'

// LinkedIn connector. We don't have live job-posting API credentials on the
// pilot account, so this runs in "assisted post" mode: produce a correctly
// formatted payload + a deep link to LinkedIn's post-a-job flow, and record the
// posting as manual_pending for the recruiter to finish + mark posted.
//
// To upgrade to API mode later: implement the `api` branch using LinkedIn's
// Job Posting API with per-tenant creds, and flip mode → 'api'.
export const linkedinConnector: BoardConnector = {
  board: 'linkedin',
  label: 'LinkedIn',
  tier: 'A',
  mode: 'assisted',
  async post(job: JobForPosting): Promise<PostResult> {
    return {
      status: 'manual_pending',
      externalUrl: 'https://www.linkedin.com/talent/post-a-job',
      payload: buildJobPayload(job),
    }
  },
  // Inbound scaffolded for v1. Replace with LinkedIn's applicant API to go live.
  inbound: 'scaffold',
  async pull(): Promise<InboundCandidate[]> {
    return sampleInboundCandidates('linkedin', 'LinkedIn')
  },
}
