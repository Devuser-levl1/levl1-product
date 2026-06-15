import * as q from './queries'

// ── MCP tools (Build 4) — READ-ONLY ────────────────────────────────────────
// Small, well-described tool set over the tenant-scoped query layer. v1 has NO
// write tools: an AI client can read but never mutate Hire data. Each `run`
// receives the API key's tenantId (resolved by withApiKeyAuth) and forwards it
// to the query layer, where tenancy is enforced.

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run(tenantId: string, args: Record<string, unknown>): Promise<unknown>
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && !isNaN(v) ? v : typeof v === 'string' && v.trim() && !isNaN(Number(v)) ? Number(v) : undefined)

export const TOOLS: McpTool[] = [
  {
    name: 'list_jobs',
    description: 'List the open jobs in this Levl1 Hire account with per-stage candidate counts. Use this first to discover job ids and titles before searching candidates or summarizing a pipeline.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: (tenantId) => q.listJobs(tenantId),
  },
  {
    name: 'search_candidates',
    description: 'Search candidates in this account. Filter by job id, pipeline stage, minimum AI resume score (0-100), and/or a keyword matched against name, email, title and company. Returns at most 50 results ordered by AI score. Example: find candidates for a job scoring above 80.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Restrict to a job (get ids from list_jobs).' },
        stage: { type: 'string', description: 'Pipeline stage name, e.g. "Screening".' },
        minScore: { type: 'number', description: 'Minimum AI resume score 0-100.' },
        keyword: { type: 'string', description: 'Free-text match on name/email/title/company.' },
        limit: { type: 'number', description: 'Max results, capped at 50 (default 25).' },
      },
      additionalProperties: false,
    },
    run: (tenantId, a) => q.searchCandidates(tenantId, { jobId: str(a.jobId), stage: str(a.stage), minScore: num(a.minScore), keyword: str(a.keyword), limit: num(a.limit) }),
  },
  {
    name: 'get_candidate',
    description: 'Get a single candidate by id: full profile, AI resume score & summary, latest interview scores, and enrichment (normalized profile, employer context, GitHub, links, AI summary). Get the id from search_candidates.',
    inputSchema: { type: 'object', properties: { candidateId: { type: 'string', description: 'Candidate id from search_candidates.' } }, required: ['candidateId'], additionalProperties: false },
    run: (tenantId, a) => q.getCandidate(tenantId, String(a.candidateId ?? '')),
  },
  {
    name: 'get_interview_report',
    description: 'Get the structured AI interview report for an interview id: overall score, recommendation, section scores, strengths, concerns and HR note. Interview ids come from get_candidate (its interviews list) or recent_activity.',
    inputSchema: { type: 'object', properties: { interviewId: { type: 'string', description: 'Interview id.' } }, required: ['interviewId'], additionalProperties: false },
    run: (tenantId, a) => q.getInterviewReport(tenantId, String(a.interviewId ?? '')),
  },
  {
    name: 'pipeline_summary',
    description: 'Summarize the pipeline: candidate counts per stage per job, plus average time-in-stage and which stages are slow (average over 7 days). Optionally restrict to one job. Use this to answer "where are candidates stuck?".',
    inputSchema: { type: 'object', properties: { jobId: { type: 'string', description: 'Optional job id to restrict the summary.' } }, additionalProperties: false },
    run: (tenantId, a) => q.pipelineSummary(tenantId, { jobId: str(a.jobId) }),
  },
  {
    name: 'recent_activity',
    description: 'List AI interviews that completed (reports ready) in the last N days (default 7, max 90), with candidate, job, overall score, recommendation and report link. Use this to summarize recent interview results.',
    inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Look-back window in days (default 7, max 90).' } }, additionalProperties: false },
    run: (tenantId, a) => q.recentActivity(tenantId, { days: num(a.days) }),
  },
]

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))
