import { BoardConnector, JobForPosting, PostResult, buildJobPayload } from '../index'

// Naukri connector — assisted post mode. Naukri's RMS API requires an
// enterprise contract; until provisioned we generate the payload + deep link to
// Naukri's recruiter post-a-job flow and mark manual_pending.
export const naukriConnector: BoardConnector = {
  board: 'naukri',
  label: 'Naukri',
  tier: 'A',
  mode: 'assisted',
  async post(job: JobForPosting): Promise<PostResult> {
    return {
      status: 'manual_pending',
      externalUrl: 'https://www.naukri.com/recruit/post-job',
      payload: buildJobPayload(job),
    }
  },
}
