import { BoardConnector, JobForPosting, PostResult, InboundCandidate, buildJobPayload, sampleInboundCandidates } from '../index'

// Indeed connector — assisted post mode (see linkedin.ts for the rationale).
// Indeed primarily ingests jobs via XML feed / sponsored-job API; until creds
// are provisioned we generate the payload + deep link and mark manual_pending.
export const indeedConnector: BoardConnector = {
  board: 'indeed',
  label: 'Indeed',
  tier: 'A',
  mode: 'assisted',
  async post(job: JobForPosting): Promise<PostResult> {
    return {
      status: 'manual_pending',
      externalUrl: 'https://employers.indeed.com/p/post-job',
      payload: buildJobPayload(job),
    }
  },
  inbound: 'scaffold',
  async pull(): Promise<InboundCandidate[]> {
    return sampleInboundCandidates('indeed', 'Indeed')
  },
}
