import { AtsConnector, ConnectorContext, NormalizedJob, NormalizedCandidate } from './types'

// ── Greenhouse connector (Phase 3 — built second) ──────────────────────────
// Harvest API, HTTP Basic auth: the API key is the username, password empty.
// Docs: https://developers.greenhouse.io/harvest.html
// Implemented and functional; needs a real Harvest API key to exercise live.

const BASE = 'https://harvest.greenhouse.io/v1'

function authHeader(apiKey: string): string {
  return 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64')
}

async function gh<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: authHeader(apiKey), 'Content-Type': 'application/json' } })
  if (res.status === 401) throw new Error('Greenhouse: invalid API key')
  if (res.status === 429) throw new Error('Greenhouse: rate limited — try again shortly')
  if (!res.ok) throw new Error(`Greenhouse: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

interface GhJob { id: number; name: string; status: string; departments?: { name: string }[]; offices?: { name: string }[] }
interface GhJobPost { content?: string }
interface GhCandidate {
  id: number; first_name: string; last_name: string; title?: string | null; company?: string | null
  email_addresses?: { value: string }[]; phone_numbers?: { value: string }[]
  social_media_addresses?: { value: string }[]
  applications?: { jobs?: { id: number }[] }[]
}

export function greenhouseConnector(ctx: ConnectorContext): AtsConnector {
  const apiKey = String(ctx.credentials.apiKey ?? '')

  return {
    provider: 'greenhouse',

    async validate() {
      if (!apiKey) throw new Error('Missing Greenhouse API key')
      // A cheap authenticated call to confirm the key works.
      await gh<GhJob[]>(apiKey, '/jobs?per_page=1')
      return {}
    },

    async listJobs(): Promise<NormalizedJob[]> {
      const jobs = await gh<GhJob[]>(apiKey, '/jobs?per_page=100&status=open')
      // Best-effort JD text from the job's live post (non-fatal per job).
      return Promise.all(jobs.map(async (j) => {
        let description: string | null = null
        try {
          const posts = await gh<GhJobPost[]>(apiKey, `/jobs/${j.id}/job_post`)
          description = Array.isArray(posts) ? (posts[0]?.content ?? null) : null
        } catch { /* JD optional */ }
        return {
          externalId: String(j.id),
          title: j.name,
          company: null,
          department: j.departments?.[0]?.name ?? null,
          location: j.offices?.[0]?.name ?? null,
          description,
          status: j.status,
        }
      }))
    },

    async listCandidates(externalJobId?: string): Promise<NormalizedCandidate[]> {
      const q = externalJobId ? `/candidates?per_page=100&job_id=${externalJobId}` : '/candidates?per_page=100'
      const cands = await gh<GhCandidate[]>(apiKey, q)
      return cands.map((c) => ({
        externalId: String(c.id),
        externalJobId: c.applications?.[0]?.jobs?.[0]?.id ? String(c.applications[0].jobs![0].id) : (externalJobId ?? null),
        name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown',
        email: c.email_addresses?.[0]?.value ?? '',
        phone: c.phone_numbers?.[0]?.value ?? null,
        currentTitle: c.title ?? null,
        currentCompany: c.company ?? null,
        linkedIn: c.social_media_addresses?.find((s) => /linkedin/i.test(s.value))?.value ?? null,
        skills: [],
        resumeText: null, // Greenhouse resumes are file attachments — fetched on demand later, not bulk-imported here.
      })).filter((c) => c.email)
    },
  }
}
