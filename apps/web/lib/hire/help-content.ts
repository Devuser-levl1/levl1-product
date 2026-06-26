// ── Help guide — SINGLE SOURCE OF TRUTH ─────────────────────────────────────
// Powers BOTH the in-app Help section (/hire/help) AND "Ask Levl1"'s how-to
// answers (via the search_help assistant tool). Update an article here and both
// stay in sync. Client-safe: pure data + pure search, no imports.

export interface HelpArticle {
  id: string
  title: string
  category: string
  /** Where the feature lives — used for deep-links ("Go to …"). */
  screen: { label: string; href: string }
  /** One or two sentences: what it does. */
  what: string
  /** Lean, ordered how-to steps. */
  steps: string[]
  /** Extra search terms (titles/what/steps are already indexed). */
  keywords?: string[]
}

export const HELP_CATEGORIES = ['Jobs & AI', 'Candidates & Pipeline', 'CRM & Finance', 'Sourcing & Outreach', 'Interviews', 'Team & Settings'] as const

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'jobs', title: 'Creating & managing jobs', category: 'Jobs & AI',
    screen: { label: 'Jobs', href: '/hire/jobs' },
    what: 'Jobs are the roles you\'re hiring for. Each job holds its description, screening rubric, pipeline stages and candidates.',
    steps: [
      'Go to Jobs and click "+ New Job".',
      'Generate a brief with AI or paste/upload a JD, then edit the fields.',
      'Set pipeline stages and (optionally) link a client.',
      'Click Publish Job. Open a job anytime to edit, pause, close or duplicate it.',
    ],
    keywords: ['role', 'position', 'open job', 'publish', 'close job', 'pause'],
  },
  {
    id: 'ai-brief', title: 'AI job-brief generator', category: 'Jobs & AI',
    screen: { label: 'Jobs → New Job', href: '/hire/jobs/new' },
    what: 'Writes a deep, role-specific job brief from a role plus a few "nudges" — not a generic template.',
    steps: [
      'On the New Job page, find the "Generate job brief with AI" panel.',
      'Type the Role, then add the Specialize nudge (e.g. ".NET / Azure"), seniority and industry.',
      'Click "Generate brief". Review and edit the generated title, summary, skills and screening criteria.',
      'Everything is editable before you publish.',
    ],
    keywords: ['generate', 'jd', 'job description', 'brief', 'nudge', 'specialize'],
  },
  {
    id: 'rubric', title: 'Creating a screening rubric', category: 'Jobs & AI',
    screen: { label: 'Jobs → New/Edit Job', href: '/hire/jobs/new' },
    what: 'A weighted list of skills the AI scores each candidate against for that specific role.',
    steps: [
      'Open the job (or the New Job page) and find Must-have / Nice-to-have skills.',
      'Add skills one per line — must-haves carry more weight and can be marked required.',
      'Use "Screening criteria" to describe how candidates are judged for THIS role.',
      'Save the job. New candidates are scored against this rubric automatically.',
    ],
    keywords: ['rubric', 'weights', 'must have', 'nice to have', 'screening criteria', 'skills'],
  },
  {
    id: 'scoring', title: 'AI candidate scoring', category: 'Jobs & AI',
    screen: { label: 'Candidates', href: '/hire/candidates' },
    what: 'Every candidate gets a 0–100 AI match score against the job rubric, with a recommendation and reasons.',
    steps: [
      'Scores appear on the Candidates list and the candidate detail page.',
      'A candidate is scored when attached to a job that has a rubric.',
      'Open a candidate to see the score breakdown, matched skills and summary.',
      'Sort/filter the Candidates list by score to focus on the strongest fits.',
    ],
    keywords: ['score', 'match', 'ai score', 'ranking', 'recommendation'],
  },
  {
    id: 'candidates', title: 'Managing candidates', category: 'Candidates & Pipeline',
    screen: { label: 'Candidates', href: '/hire/candidates' },
    what: 'The people in your hiring process — searchable, scored, and movable through stages.',
    steps: [
      'Go to Candidates to search and filter by job, stage, score or keyword.',
      'Open a candidate for profile, resume, AI score, notes and activity.',
      'Add candidates via a job\'s apply page, bulk import, or sourcing.',
      'Use the pipeline to move them between stages.',
    ],
    keywords: ['candidate', 'applicant', 'resume', 'cv', 'import'],
  },
  {
    id: 'pipeline', title: 'Working the pipeline', category: 'Candidates & Pipeline',
    screen: { label: 'Pipeline', href: '/hire/pipeline' },
    what: 'A kanban board per job — drag candidates across stages, with a Rejected swimlane.',
    steps: [
      'Go to Pipeline and pick a job.',
      'Drag a candidate card to a new stage to advance them.',
      'To reject, move to Rejected and enter a reason (required, logged).',
      'Stage moves can trigger automatic candidate emails if configured.',
    ],
    keywords: ['pipeline', 'kanban', 'stage', 'move', 'reject', 'board'],
  },
  {
    id: 'crm', title: 'CRM: clients & contacts', category: 'CRM & Finance',
    screen: { label: 'CRM', href: '/hire/crm' },
    what: 'Your client companies and their contacts. Admin-only.',
    steps: [
      'Go to CRM → Clients and click "+ Add Client".',
      'Add the company, industry and a primary contact.',
      'Open a client to manage contacts, log calls/emails, and see linked jobs & deals.',
      'Link jobs to a client from the job page.',
    ],
    keywords: ['crm', 'client', 'company', 'contact', 'account'],
  },
  {
    id: 'deals', title: 'Deals & deal economics', category: 'CRM & Finance',
    screen: { label: 'CRM → Deals', href: '/hire/crm' },
    what: 'Track revenue opportunities per client with stages and auto-computed deal size. Admin-only.',
    steps: [
      'Go to CRM → Deals and click "+ New Deal".',
      'Pick a client and enter economics (positions × bill rate × hours × duration) to auto-compute value.',
      'Set the stage and probability; link the jobs the deal staffs.',
      'Drag deals across stages on the board.',
    ],
    keywords: ['deal', 'revenue', 'bill rate', 'economics', 'value', 'pipeline value'],
  },
  {
    id: 'ar', title: 'Accounts Receivable (invoices)', category: 'CRM & Finance',
    screen: { label: 'Receivables', href: '/hire/crm/ar' },
    what: 'Invoices per client/deal with ageing, overdue tracking and automatic payment reminders. Admin-only.',
    steps: [
      'Go to Receivables and click "+ New Invoice".',
      'Pick a client (and optional deal to prefill the amount), set sent date, due cycle and reminder interval.',
      'The dashboard shows total owed, ageing buckets (0–30 / 31–60 / 60+) and days overdue.',
      'Overdue invoices send automatic reminders; click "Mark paid" to stop them.',
    ],
    keywords: ['accounts receivable', 'ar', 'invoice', 'overdue', 'ageing', 'aging', 'payment', 'reminder', 'collections'],
  },
  {
    id: 'sourcing', title: 'Sourcing candidates', category: 'Sourcing & Outreach',
    screen: { label: 'Sourcing', href: '/hire/sourcing' },
    what: 'Find and import candidates into a job from external sources.',
    steps: [
      'Go to Sourcing and choose a job to source for.',
      'Review suggested candidates and import the ones you want.',
      'Imported candidates are scored against the job rubric.',
      'Track them in Candidates and the Pipeline.',
    ],
    keywords: ['sourcing', 'source', 'find candidates', 'import'],
  },
  {
    id: 'search-strings', title: 'Boolean search strings', category: 'Sourcing & Outreach',
    screen: { label: 'Job → Search strings', href: '/hire/jobs' },
    what: 'AI-generated boolean search strings to find candidates on LinkedIn, job boards and Google.',
    steps: [
      'Open a job and find the Search strings / sourcing tools.',
      'Generate strings tailored to the role\'s skills.',
      'Copy a string into LinkedIn, Google or a job board.',
      'Refine by editing the job\'s skills and regenerating.',
    ],
    keywords: ['boolean', 'search string', 'x-ray', 'linkedin search', 'google search'],
  },
  {
    id: 'email', title: 'Email & campaigns', category: 'Sourcing & Outreach',
    screen: { label: 'Campaigns', href: '/hire/campaigns' },
    what: 'Send personalized outreach to candidates individually or as a campaign.',
    steps: [
      'Email a single candidate from their detail page.',
      'For bulk outreach, go to Campaigns and create a campaign.',
      'Pick the audience, write/select a template, and preview before sending.',
      'Stage moves can also trigger automatic emails (see job settings).',
    ],
    keywords: ['email', 'campaign', 'outreach', 'template', 'bulk email'],
  },
  {
    id: 'inbox', title: 'Inbox & inbound job specs', category: 'Sourcing & Outreach',
    screen: { label: 'Inbox', href: '/hire/inbox' },
    what: 'Connect a mailbox so client emails arrive in Levl1; AI flags job specs you can turn into positions.',
    steps: [
      'Connect a mailbox in Settings → Mailbox.',
      'Open Inbox to read mail; the "Job specs" tab shows AI-flagged hiring requests.',
      'On a flagged email, click "Draft position" to AI-draft a job for review.',
      'Approve to create the job (and optionally a linked CRM deal).',
    ],
    keywords: ['inbox', 'mailbox', 'email intake', 'job spec', 'draft position'],
  },
  {
    id: 'interviews', title: 'Launching AI interviews', category: 'Interviews',
    screen: { label: 'Interviews', href: '/hire/interviews' },
    what: 'Trigger a Levl1 Interviews (AI voice) session for a candidate and sync the scorecard back.',
    steps: [
      'Open a candidate or the Interviews section.',
      'Launch an interview — the candidate gets a scheduling link (email/WhatsApp).',
      'The AI conducts the L1 interview and produces an evidence-based scorecard.',
      'The score syncs back to the candidate so you can compare and advance them.',
    ],
    keywords: ['interview', 'ai interview', 'voice', 'scorecard', 'launch interview', 'screen'],
  },
  {
    id: 'team', title: 'Team management & oversight', category: 'Team & Settings',
    screen: { label: 'Team', href: '/hire/team' },
    what: 'Manage recruiters, see who\'s working on what, and reassign jobs. Manager/Admin only.',
    steps: [
      'Go to Team → Oversight for workload, ageing jobs and placements.',
      'Use the Assignment board to drag jobs between recruiters.',
      'Invite teammates and set their role from Settings → Team.',
      'Roles: Admin (everything), Manager (team + assignment + oversight), Recruiter (own assigned work).',
    ],
    keywords: ['team', 'recruiters', 'oversight', 'reassign', 'roles', 'invite', 'workload'],
  },
  {
    id: 'client-assignment', title: 'Assigning recruiters to clients', category: 'Team & Settings',
    screen: { label: 'Team → Client assignments', href: '/hire/team' },
    what: 'Assign recruiters to specific clients. A recruiter then sees only their assigned clients\' jobs, candidates and deals. Manager/Admin only.',
    steps: [
      'Go to Team and open the "Client assignments" tab.',
      'Find the client and click Edit.',
      'Tick the recruiters to assign, then Save.',
      'Those recruiters now see only that client\'s work; managers/admins see everything.',
    ],
    keywords: ['assign recruiter', 'client assignment', 'visibility', 'scope', 'who sees what'],
  },
  {
    id: 'settings', title: 'Settings, billing & integrations', category: 'Team & Settings',
    screen: { label: 'Settings', href: '/hire/settings' },
    what: 'Account-wide configuration: team, plan & billing, career page, mailbox and job boards. Admin-only for most.',
    steps: [
      'Go to Settings to manage your team, branding and integrations.',
      'Billing shows your plan, usage and upgrade options.',
      'Connect a mailbox and job boards from their settings pages.',
      'Set up your public career page under Settings → Career page.',
    ],
    keywords: ['settings', 'billing', 'plan', 'upgrade', 'career page', 'job boards', 'integrations'],
  },
  {
    id: 'ask-levl1', title: 'Using Ask Levl1', category: 'Team & Settings',
    screen: { label: 'Ask Levl1 (right panel)', href: '/hire/dashboard' },
    what: 'The assistant answers questions about your data, performs actions with your approval, and guides you on how to use Levl1.',
    steps: [
      'Open Ask Levl1 from the side panel.',
      'Ask about data: "How many candidates in screening?"',
      'Ask it to act: "Add 5 candidates to this job\'s pipeline" — you approve before anything changes.',
      'Ask how-to: "How do I create a rubric?" — it explains the steps and points to the screen.',
    ],
    keywords: ['ask levl1', 'assistant', 'ai', 'help', 'how to'],
  },
]

const norm = (s: string) => s.toLowerCase()
// Strip punctuation so "rubric?" matches "rubric"; collapse whitespace.
const clean = (s: string) => norm(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

// Generic words that shouldn't drive ranking ("how do I…", "where do I see…").
const STOP = new Set(['how', 'do', 'i', 'to', 'a', 'an', 'the', 'is', 'in', 'on', 'of', 'my', 'me', 'can', 'where', 'what', 'when', 'does', 'see', 'find', 'get', 'use', 'using', 'add', 'set', 'up', 'for', 'and', 'or', 'with', 'you', 'your', 'this', 'that', 'it', 'we'])

/** Pure keyword search over the articles — shared by the Help UI and the assistant. */
export function searchHelp(query: string, limit = 5): HelpArticle[] {
  const cq = clean(query)
  if (!cq) return []
  const terms = cq.split(' ').filter((t) => t.length > 1 && !STOP.has(t))
  // If the query was ALL stopwords, fall back to the raw tokens so we still match.
  const effective = terms.length ? terms : cq.split(' ').filter((t) => t.length > 1)

  const scored = HELP_ARTICLES.map((a) => {
    const title = clean(a.title)
    const kw = clean((a.keywords ?? []).join(' '))
    const body = clean([a.category, a.what, a.steps.join(' ')].join(' '))
    let score = 0
    for (const t of effective) {
      if (title.includes(t)) score += 5
      else if (kw.includes(t)) score += 4
      else if (body.includes(t)) score += 1
    }
    if (title.includes(cq)) score += 6
    return { a, score }
  }).filter((x) => x.score > 0).sort((x, y) => y.score - x.score)
  return scored.slice(0, limit).map((x) => x.a)
}

export function getArticle(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.id === id)
}
