import type { BoardConnector, BoardCfg, JobForPosting, PostResult } from './types'
import { NOT_IMPLEMENTED, API_PENDING } from './types'

// Map a Levl1 job → Naukri's posting payload shape. Real shape; sent to the live
// API once access is enabled. Naukri needs industry + roleCategory that a Levl1
// job lacks → collected once at post time (AI-suggested).
function mapNaukri(job: JobForPosting, extra?: Record<string, string>) {
  return {
    title: job.title,
    description: job.description,
    location: job.location ?? '',
    minSalary: job.salaryMin ?? undefined,
    maxSalary: job.salaryMax ?? undefined,
    employmentType: job.employmentType ?? 'Full Time',
    keySkills: job.skills,
    industry: extra?.industry ?? '',
    roleCategory: extra?.roleCategory ?? '',
    applyUrl: job.applyUrl,
    companyName: job.companyName ?? '',
  }
}

export const naukriConnector: BoardConnector = {
  provider: 'naukri',
  label: 'Naukri',
  authType: 'api_key',
  capabilities: { canPost: true, canSearch: true },
  credFields: [
    { key: 'apiKey', label: 'API key', placeholder: 'Naukri-issued API key' },
    { key: 'accountId', label: 'Account / client ID', placeholder: 'Your Naukri account id' },
  ],
  postingExtraFields: [
    { key: 'industry', label: 'Industry', placeholder: 'e.g. IT Services & Consulting' },
    { key: 'roleCategory', label: 'Role category', placeholder: 'e.g. Software Development' },
  ],
  async testConnection(cfg: BoardCfg) {
    const apiKey = (cfg.apiKey || '').trim()
    const accountId = (cfg.accountId || '').trim()
    if (apiKey.length < 8) return { ok: false, error: 'API key looks too short — paste the full key Naukri issued.' }
    if (!accountId) return { ok: false, error: 'Account / client ID is required.' }
    return { ok: true, accountId }
  },
  async postJob(_cfg: BoardCfg, job: JobForPosting, extra?: Record<string, string>): Promise<PostResult> {
    const payload = mapNaukri(job, extra)
    void payload // TODO(API): POST payload to Naukri under the recruiter's account, return externalRefId + url.
    return API_PENDING('Naukri')
  },
  async updateJob(_cfg: BoardCfg, _ref: string, job: JobForPosting, extra?: Record<string, string>): Promise<PostResult> {
    void mapNaukri(job, extra) // TODO(API): PUT update under the recruiter's account.
    return API_PENDING('Naukri')
  },
  async closeJob(): Promise<PostResult> {
    return API_PENDING('Naukri') // TODO(API): close/expire the posting under the recruiter's account.
  },
  async search() { return NOT_IMPLEMENTED },
}
