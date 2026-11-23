// ── Demo gallery personas (Build 05, Screen-scoped) ────────────────────────
// Pre-built, pre-approved technical L1 interviews for the no-friction demo.
// GLOBAL / ENTERPRISE framing, neutral/multi-accent voices — deliberately NOT
// an India-SMB HR/Sales/VC mix. Each persona is sized for a SHORT ~5–8 min
// taste (one substantive exercise + a couple of focused turns; the Build-03
// warm-up runs first). Demo duration is intentionally DECOUPLED from the
// 30-minute production envelope.
//
// CONFIG-DRIVEN: add more personas by appending to ALL_DEMO_PERSONAS (data
// only) — the gallery + launch path need no code changes.
//
// ONE CODE PATH: a demo is the REAL room + engine with demo content. Every
// technical persona carries a hands-on work sample (`work.taskKey` → a
// machine-verified Levl1 starter task, lib/screen/taskbank/content.ts), so the
// demo shows the Monaco + Judge0 IDE and observe-and-defend exactly as a real
// technical interview does. lib/screen/demo/work-sample.ts builds the task.

export type DemoCategory = 'Backend' | 'Frontend' | 'Full-Stack' | 'Data' | 'Analytics' | 'DevOps' | 'ML' | 'Product' | 'Program' | 'Risk' | 'Marketing'

export interface DemoQuestion { question: string; expectedKeyPoints: string[]; techTag?: string; estimatedMinutes?: number; followUp?: string }

export interface DemoPersona {
  slug: string
  title: string
  category: DemoCategory
  skills: string[]
  durationMin: number          // short demo window — NOT the 30-min production envelope
  accent: string               // neutral / global, never a single India locale
  language: string
  blurb: string
  jdText: string
  featured?: boolean           // shown as a role chip in the site hero (keep it to ~3)
  // Hands-on work sample (technical personas). taskTitle/language are display
  // copies for the client gallery; the server builds the task from taskKey.
  work?: { taskKey: string; taskTitle: string; language: string; minutes: number }
  questions: {
    technical: DemoQuestion[]
    scenario: DemoQuestion[]
    behavioral: DemoQuestion[]
    eq: DemoQuestion[]
    whiteboard: DemoQuestion[]
  }
}

const beh = (q: string, kp: string[]): DemoQuestion => ({ question: q, expectedKeyPoints: kp, estimatedMinutes: 2 })
const tech = (q: string, kp: string[], tag: string): DemoQuestion => ({ question: q, expectedKeyPoints: kp, techTag: tag, estimatedMinutes: 3 })

// Full persona data, including non-technical roles kept for reference. Only the
// technical subset below is offered (site gallery + /api/demo/start).
const ALL_DEMO_PERSONAS: DemoPersona[] = [
  {
    slug: 'backend-engineer',
    title: 'Backend Engineer',
    category: 'Backend',
    skills: ['APIs', 'Databases', 'Concurrency', 'System design'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English', featured: true,
    blurb: 'Server-side fundamentals — API design, data modelling and scaling.',
    jdText: 'A backend engineer building scalable, reliable services and APIs. Strong on data modelling, concurrency and pragmatic system design. Writes and ships production code.',
    work: { taskKey: 'backend-mid-rate-limiter', taskTitle: 'Per-client rate limiter', language: 'Python, JS, TS, Java, Go, C++', minutes: 6 },
    questions: {
      technical: [
        tech('A client retries a POST request after a timeout. How do you make sure the action does not happen twice?', ['idempotency keys', 'dedupe store + TTL', 'safe retries / at-least-once', 'what the client sees'], 'api-design'),
        tech('How do you keep a database query fast as a table grows into the millions of rows? Give a concrete example.', ['indexing', 'query plan / EXPLAIN', 'pagination', 'avoiding N+1'], 'databases'),
      ],
      scenario: [tech('A service is intermittently returning 500s under load but is healthy at low traffic. How do you investigate?', ['observability / metrics', 'connection pool / timeouts', 'reproduce under load', 'isolate dependency'], 'debugging')],
      behavioral: [beh('Tell me about a backend system you personally owned end-to-end. What was your specific contribution?', ['personal ownership', 'concrete decisions', 'outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'data-engineer',
    title: 'Data Engineer',
    category: 'Data',
    skills: ['SQL', 'Pipelines', 'Modelling', 'Spark'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English', featured: true,
    blurb: 'Reliable data pipelines, modelling and warehouse performance.',
    jdText: 'A data engineer building reliable batch/stream pipelines and well-modelled warehouses. Writes production Python and SQL.',
    work: { taskKey: 'data-mid-dau', taskTitle: 'Daily active users from a raw event log', language: 'Python, JS, TS, Java, Go', minutes: 6 },
    questions: {
      technical: [
        tech('How would you design a pipeline that ingests daily event data and makes it queryable for analysts the next morning?', ['ingest → transform → serve', 'idempotency / late data', 'partitioning', 'data quality checks'], 'pipelines'),
        tech('A nightly job is getting slower every week. How do you find and fix the cause?', ['data growth', 'partition pruning', 'skew', 'incremental vs full load'], 'performance'),
      ],
      scenario: [tech('Analysts report numbers that do not reconcile between two dashboards. How do you investigate?', ['lineage', 'source of truth', 'transformation diffs', 'validation'], 'data-quality')],
      behavioral: [beh('Describe a data pipeline you owned. What reliability problem did you solve?', ['ownership', 'specific problem', 'result'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'fullstack-engineer',
    title: 'Full-Stack Engineer',
    category: 'Full-Stack',
    skills: ['React', 'Node.js', 'APIs', 'SQL'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English', featured: true,
    blurb: 'End-to-end feature ownership across client, API and database.',
    jdText: 'A full-stack engineer shipping features across the front end, API and database with sound trade-offs at each layer. Writes and ships production code.',
    work: { taskKey: 'fullstack-mid-cart-pricing', taskTitle: 'Cart pricing with promo codes', language: 'JS, TS, Python, Java, Go', minutes: 6 },
    questions: {
      technical: [
        tech('Take a feature like "user can favourite an item." Walk me through it from the UI click to the database and back.', ['client request', 'API endpoint + validation', 'data model', 'optimistic UI / error handling'], 'full-stack'),
        tech('How do you keep an API contract stable while the frontend and backend evolve independently?', ['versioning', 'typed contracts', 'backward compatibility', 'deprecation'], 'api-design'),
      ],
      scenario: [tech('A feature works locally but fails in production only for some users. How do you approach it?', ['environment differences', 'logs/observability', 'reproduce', 'data-dependent edge cases'], 'debugging')],
      behavioral: [beh('Tell me about a time you owned a feature across the whole stack. What did you personally build?', ['end-to-end ownership', 'specific work', 'outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    category: 'Frontend',
    skills: ['JavaScript', 'TypeScript', 'React', 'Async UI'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English',
    blurb: 'Interactive UI that stays correct under real network conditions.',
    jdText: 'A frontend engineer building fast, correct interfaces in TypeScript and React, comfortable with async state, performance and accessibility. Writes and ships production code.',
    work: { taskKey: 'frontend-mid-search-race', taskTitle: 'Search-as-you-type: debounce and stale responses', language: 'JS, TS, Python', minutes: 6 },
    questions: {
      technical: [
        tech('A page feels slow even though the API is fast. How do you find out what the browser is spending time on?', ['performance profiling / devtools', 'render vs network vs script', 'bundle size / long tasks', 'measure before and after'], 'performance'),
      ],
      scenario: [tech('A component shows the wrong data for a moment after the user switches tabs quickly. What is likely happening and how do you fix it?', ['race / stale closure', 'cancel or ignore stale requests', 'keyed state', 'test the fix'], 'async-ui')],
      behavioral: [beh('Tell me about a UI you built that real users struggled with. What did you change?', ['user evidence', 'specific change', 'measured result'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'devops-engineer',
    title: 'DevOps / SRE Engineer',
    category: 'DevOps',
    skills: ['CI/CD', 'Observability', 'Kubernetes', 'Incident response'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English',
    blurb: 'Safe releases, observability and calm incident response.',
    jdText: 'A DevOps / site reliability engineer who automates delivery, defines SLOs, builds observability, and writes Python or Go tooling for safe rollouts.',
    work: { taskKey: 'devops-mid-canary-gate', taskTitle: 'Canary rollout health gate', language: 'Python, Go, JS, Java', minutes: 6 },
    questions: {
      technical: [
        tech('How would you define an SLO for a public API, and what would you alert on?', ['SLI choice (latency / availability)', 'error budget', 'symptom-based alerts', 'avoid alert fatigue'], 'slo'),
      ],
      scenario: [tech('A deploy went out and error rates doubled ten minutes later. Walk me through the first fifteen minutes.', ['mitigate first (rollback)', 'communicate', 'check what changed', 'blameless follow-up'], 'incident')],
      behavioral: [beh('Tell me about an incident you led or helped resolve. What did you personally do?', ['ownership', 'specific actions', 'what changed afterwards'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    category: 'Analytics',
    skills: ['SQL', 'Metrics', 'Data quality', 'Storytelling'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English',
    blurb: 'SQL fluency and turning messy data into trustworthy numbers.',
    jdText: 'A data analyst who writes solid SQL, defines metrics carefully, checks data quality, and explains results clearly to the business.',
    work: { taskKey: 'data-junior-sql-revenue', taskTitle: 'Monthly paid revenue by country (SQL)', language: 'SQL', minutes: 6 },
    questions: {
      technical: [
        tech('How do you make sure a metric like "active customers" means the same thing in every report?', ['written definition', 'single source / semantic layer', 'edge cases (refunds, test accounts)', 'review with stakeholders'], 'metrics'),
      ],
      scenario: [tech('Revenue in your dashboard dropped 20% overnight. How do you work out whether it is real or a data problem?', ['check pipeline freshness', 'compare to source', 'segment the drop', 'communicate uncertainty'], 'data-quality')],
      behavioral: [beh('Tell me about an analysis that changed a decision. What did you find and how did you present it?', ['question framed', 'specific finding', 'impact on the decision'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'ml-engineer',
    title: 'ML Engineer',
    category: 'ML',
    skills: ['Python', 'Model evaluation', 'Data', 'Deployment'],
    durationMin: 10, accent: 'Neutral (global)', language: 'English',
    blurb: 'Evaluating models honestly and getting them to production.',
    jdText: 'An ML engineer who evaluates models rigorously, builds training and serving pipelines in Python, and monitors models in production.',
    work: { taskKey: 'ml-mid-classifier-metrics', taskTitle: 'Evaluate a multi-class classifier', language: 'Python, JS, Java, C++', minutes: 6 },
    questions: {
      technical: [
        tech('Your model scores 95% accuracy on a fraud dataset. Why might that be misleading, and what would you look at instead?', ['class imbalance', 'precision / recall / PR-AUC', 'cost of errors', 'threshold choice'], 'evaluation'),
      ],
      scenario: [tech('A model that did well offline performs worse in production after a month. How do you investigate?', ['data / concept drift', 'training-serving skew', 'monitoring', 'retraining policy'], 'mlops')],
      behavioral: [beh('Tell me about a model you took to production. What did you personally own?', ['ownership', 'specific decisions', 'outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'product-manager',
    title: 'Product Manager',
    category: 'Product',
    skills: ['Prioritization', 'Discovery', 'Metrics', 'Stakeholders'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Product sense — framing problems, prioritising, and measuring impact.',
    jdText: 'A product manager who frames customer problems, prioritises ruthlessly, aligns stakeholders, and ties launches to measurable outcomes.',
    questions: {
      technical: [
        tech('Walk me through how you decide what to build next when engineering, sales, and a big customer all want different things.', ['prioritization framework', 'data + impact vs effort', 'stakeholder alignment', 'saying no with rationale'], 'prioritization'),
        tech('How do you tell whether a feature you shipped actually worked? Give a concrete example.', ['success metric defined upfront', 'leading vs lagging', 'instrumentation', 'iterate or kill'], 'metrics'),
      ],
      scenario: [tech('Adoption of a new feature is far below your forecast two weeks after launch. How do you investigate?', ['funnel / drop-off', 'talk to users', 'segment', 'hypothesis-driven fixes'], 'discovery')],
      behavioral: [beh('Tell me about a product decision you owned that was unpopular but right. How did you handle it?', ['ownership', 'evidence over opinion', 'stakeholder management', 'outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'project-manager',
    title: 'Project Manager',
    category: 'Program',
    skills: ['Planning', 'Risk', 'Delivery', 'Communication'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Delivery leadership — planning, risk, and keeping cross-functional work on track.',
    jdText: 'A project/program manager who plans realistically, surfaces risk early, unblocks teams, and drives cross-functional delivery to a date.',
    questions: {
      technical: [
        tech('A cross-functional project is slipping and the deadline is fixed. Walk me through what you actually do.', ['re-scope vs resource', 'critical path', 'transparent trade-offs', 'escalation'], 'delivery'),
        tech('How do you identify and track risks on a project before they become fire-fights?', ['risk register', 'likelihood x impact', 'mitigation owners', 'early signals'], 'risk'),
      ],
      scenario: [tech('Two teams you depend on disagree on an interface and it is blocking delivery. How do you resolve it?', ['get the decision-makers in a room', 'frame the trade-off', 'time-box', 'document + move on'], 'stakeholders')],
      behavioral: [beh('Tell me about a project you personally rescued when it was off track. What did you do?', ['ownership', 'specific actions', 'outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'risk-auditor',
    title: 'Risk & Compliance Auditor',
    category: 'Risk',
    skills: ['Controls', 'SOX/ITGC', 'Audit', 'Evidence'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Controls & audit — testing controls, finding gaps, and evidencing them.',
    jdText: 'A risk & compliance auditor who designs and tests controls, identifies gaps, and documents audit-quality evidence across IT and process risk.',
    questions: {
      technical: [
        tech('Walk me through how you would test an access-control (ITGC) for a financial system end to end.', ['design vs operating effectiveness', 'sample selection', 'evidence', 'exceptions handling'], 'itgc'),
        tech('You find a control gap during an audit. What do you do, step by step?', ['quantify exposure', 'root cause', 'remediation + owner', 'document finding'], 'audit'),
      ],
      scenario: [tech('A control owner pushes back that your finding is "not a real risk." How do you handle it?', ['evidence-based', 'tie to a real exposure', 'professional, not adversarial', 'escalate if needed'], 'controls')],
      behavioral: [beh('Tell me about an audit or risk finding you owned that drove a real change. What was your contribution?', ['ownership', 'specific finding', 'measurable outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'marketing-specialist',
    title: 'Marketing Specialist',
    category: 'Marketing',
    skills: ['Campaigns', 'Funnel', 'Content', 'Analytics'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Growth marketing — campaigns, funnel, and tying spend to results.',
    jdText: 'A marketing specialist who plans and runs campaigns, owns funnel metrics, and ties spend to pipeline and measurable results.',
    questions: {
      technical: [
        tech('You have a fixed budget to grow qualified leads next quarter. Walk me through how you would allocate it.', ['channel mix by CAC/intent', 'test budget', 'funnel stage targeting', 'measurement plan'], 'campaigns'),
        tech('A campaign is getting lots of clicks but very few conversions. How do you diagnose it?', ['message-match / landing page', 'audience targeting', 'funnel drop-off', 'attribution'], 'funnel'),
      ],
      scenario: [tech('Leadership asks you to prove marketing drove revenue last quarter. How do you approach it?', ['attribution model', 'pipeline influenced vs sourced', 'caveats / honesty', 'leading indicators'], 'analytics')],
      behavioral: [beh('Tell me about a campaign you personally owned that you are proud of. What did you do and what happened?', ['ownership', 'specific work', 'measured impact'])],
      eq: [], whiteboard: [],
    },
  },
]

/** Categories offered in the demo — technical hiring only (each with a hands-on work sample). */
export const DEMO_CATEGORIES: DemoCategory[] = ['Backend', 'Frontend', 'Full-Stack', 'Data', 'Analytics', 'DevOps', 'ML']

/** The personas the demo offers. getDemoPersona only resolves these, so
 *  /api/demo/start rejects non-technical slugs too. (Admin lead lists fall
 *  back to the raw slug for older non-technical leads.) */
export const DEMO_PERSONAS: DemoPersona[] = ALL_DEMO_PERSONAS
  .filter((p) => DEMO_CATEGORIES.includes(p.category))
  .sort((a, b) => DEMO_CATEGORIES.indexOf(a.category) - DEMO_CATEGORIES.indexOf(b.category))

/** The few roles shown as chips in the site hero (the gallery shows all). */
export const FEATURED_DEMO_PERSONAS: DemoPersona[] = DEMO_PERSONAS.filter((p) => p.featured)

export function getDemoPersona(slug: string): DemoPersona | undefined { return DEMO_PERSONAS.find((p) => p.slug === slug) }
