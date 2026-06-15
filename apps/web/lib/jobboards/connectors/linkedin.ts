import { BoardConnector, JobForPosting, PostResult, buildJobPayload } from '../index'

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
}
