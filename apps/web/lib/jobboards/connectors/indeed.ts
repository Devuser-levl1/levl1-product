import { BoardConnector, JobForPosting, PostResult, InboundCandidate, FormattedPost, buildJobPayload, sampleInboundCandidates } from '../index'

// Indeed adapter — ASSISTED model (no API, no automation). Indeed has no usable
// public post-a-job API and automating the employer UI risks the recruiter's
// account, so Levl1 maps the job to Indeed's expected fields and produces a
// copy-ready post; the recruiter pastes it and submits under their own Indeed
// employer account. This is the reference adapter other boards replicate.

// Indeed's "post a job" entry point (employer account).
const INDEED_POST_URL = 'https://employers.indeed.com/p/post-job'

// Map a Levl1 job → the fields Indeed's post-a-job form asks for.
function formatIndeed(job: JobForPosting): FormattedPost {
  const fields = [
    { label: 'Job title', value: job.title },
    { label: 'Company name', value: job.companyName ?? '—' },
    { label: 'Location', value: job.location ?? 'Remote / Not specified' },
    { label: 'Job type', value: 'Full-time' },
  ]
  if (job.salaryMin || job.salaryMax) {
    const fmt = (n: number) => `₹${(n / 100000).toFixed(1)}L`
    fields.push({ label: 'Pay', value: `${job.salaryMin ? fmt(job.salaryMin) : '–'} – ${job.salaryMax ? fmt(job.salaryMax) : '–'} per annum` })
  }
  fields.push({ label: 'Job description', value: job.description })
  fields.push({ label: 'How to apply (link)', value: job.applyUrl })
  return { fields, copyText: buildJobPayload(job) }
}

export const indeedConnector: BoardConnector = {
  board: 'indeed',
  label: 'Indeed',
  tier: 'A',
  mode: 'assisted',
  postUrl: INDEED_POST_URL,
  formatPost: formatIndeed,
  // "post" in the assisted model does NOT auto-post. It returns the deep link +
  // the formatted payload and records the posting as manual_pending; the
  // recruiter finishes on Indeed and confirms.
  async post(job: JobForPosting): Promise<PostResult> {
    return {
      status: 'manual_pending',
      externalUrl: INDEED_POST_URL,
      payload: formatIndeed(job).copyText,
    }
  },
  inbound: 'scaffold',
  async pull(): Promise<InboundCandidate[]> {
    return sampleInboundCandidates('indeed', 'Indeed')
  },
}
