import type { BoardConnector, BoardCfg, JobForPosting, PostResult } from './types'
import { NOT_IMPLEMENTED, API_PENDING } from './types'

// Map a Levl1 job → Indeed's posting payload. No extra fields needed → truly
// one-click. Live API swapped in once access is enabled.
function mapIndeed(job: JobForPosting) {
  return {
    title: job.title,
    description: job.description,
    location: job.location ?? '',
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    jobType: job.employmentType ?? 'fulltime',
    applyUrl: job.applyUrl,
    company: job.companyName ?? '',
  }
}

export const indeedConnector: BoardConnector = {
  provider: 'indeed',
  label: 'Indeed',
  authType: 'api_key',
  capabilities: { canPost: true, canSearch: false },
  credFields: [
    { key: 'apiKey', label: 'API key / token', placeholder: 'Indeed-issued key or token' },
    { key: 'email', label: 'Account email', placeholder: 'you@yourcompany.com' },
  ],
  postingExtraFields: [],
  async testConnection(cfg: BoardCfg) {
    const apiKey = (cfg.apiKey || '').trim()
    const email = (cfg.email || '').trim()
    if (apiKey.length < 8) return { ok: false, error: 'API key/token looks too short.' }
    if (!email.includes('@')) return { ok: false, error: 'A valid account email is required.' }
    return { ok: true, accountId: email }
  },
  async postJob(_cfg: BoardCfg, job: JobForPosting): Promise<PostResult> {
    void mapIndeed(job) // TODO(API): POST to Indeed under the recruiter's account.
    return API_PENDING('Indeed')
  },
  async updateJob(_cfg: BoardCfg, _ref: string, job: JobForPosting): Promise<PostResult> {
    void mapIndeed(job) // TODO(API): update under the recruiter's account.
    return API_PENDING('Indeed')
  },
  async closeJob(): Promise<PostResult> {
    return API_PENDING('Indeed')
  },
  async search() { return NOT_IMPLEMENTED },
}
