// ── Demo gallery personas (Build 05, Screen-scoped) ────────────────────────
// Pre-built, pre-approved technical L1 interviews for the no-friction demo.
// GLOBAL / ENTERPRISE framing, neutral/multi-accent voices — deliberately NOT
// an India-SMB HR/Sales/VC mix. Each persona is sized for a SHORT ~5–8 min
// taste (one substantive exercise + a couple of focused turns; the Build-03
// warm-up runs first). Demo duration is intentionally DECOUPLED from the
// 30-minute production envelope.

export type DemoCategory = 'Backend' | 'Frontend' | 'Full-Stack' | 'Data' | 'DevOps'

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

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    slug: 'backend-engineer',
    title: 'Backend Engineer',
    category: 'Backend',
    skills: ['APIs', 'Databases', 'Concurrency', 'System design'],
    durationMin: 6, accent: 'Neutral (global)', language: 'English',
    blurb: 'Server-side fundamentals — API design, data modelling and scaling.',
    jdText: 'A backend engineer building scalable, reliable services and APIs. Strong on data modelling, concurrency and pragmatic system design.',
    questions: {
      technical: [
        tech('Walk me through how you would design a rate limiter for a public API. What approach would you pick and why?', ['token bucket / sliding window', 'where state lives (per-user, Redis)', 'burst vs steady-rate', 'failure mode on limit'], 'system-design'),
        tech('How do you keep a database query fast as a table grows into the millions of rows? Give a concrete example.', ['indexing', 'query plan / EXPLAIN', 'pagination', 'avoiding N+1'], 'databases'),
      ],
      scenario: [tech('A service is intermittently returning 500s under load but is healthy at low traffic. How do you investigate?', ['observability / metrics', 'connection pool / timeouts', 'reproduce under load', 'isolate dependency'], 'debugging')],
      behavioral: [beh('Tell me about a backend system you personally owned end-to-end. What was your specific contribution?', ['personal ownership', 'concrete decisions', 'outcome'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    category: 'Frontend',
    skills: ['React', 'TypeScript', 'Performance', 'Accessibility'],
    durationMin: 6, accent: 'Neutral (global)', language: 'English',
    blurb: 'Modern UI engineering — component design, state and performance.',
    jdText: 'A frontend engineer building performant, accessible UIs with React and TypeScript.',
    questions: {
      technical: [
        tech('How do you decide where state should live in a React app, and when do you reach for a global store?', ['local vs lifted vs global', 'prop drilling', 'server vs client state', 'avoiding over-engineering'], 'react'),
        tech('A page feels janky while scrolling a long list. How do you diagnose and fix it?', ['virtualization', 'reflow/repaint', 'memoization', 'profiling'], 'performance'),
      ],
      scenario: [tech('Marketing wants a complex interactive component shipped this week. How do you scope it without compromising accessibility?', ['accessibility baseline', 'scope trade-offs', 'keyboard/ARIA', 'incremental delivery'], 'a11y')],
      behavioral: [beh('Describe a frontend feature you built that you are proud of. What was hard about it?', ['ownership', 'specific challenge', 'result'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'fullstack-engineer',
    title: 'Full-Stack Engineer',
    category: 'Full-Stack',
    skills: ['React', 'Node.js', 'APIs', 'SQL'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'End-to-end feature ownership across client, API and database.',
    jdText: 'A full-stack engineer shipping features across the front end, API and database with sound trade-offs at each layer.',
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
    slug: 'data-engineer',
    title: 'Data Engineer',
    category: 'Data',
    skills: ['SQL', 'Pipelines', 'Modelling', 'Spark'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Reliable data pipelines, modelling and warehouse performance.',
    jdText: 'A data engineer building reliable batch/stream pipelines and well-modelled warehouses.',
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
    slug: 'devops-sre',
    title: 'DevOps / SRE',
    category: 'DevOps',
    skills: ['CI/CD', 'Kubernetes', 'Observability', 'Reliability'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Reliability, deployment automation and incident response.',
    jdText: 'A DevOps/SRE engineer responsible for reliable deploys, observability and incident response.',
    questions: {
      technical: [
        tech('Walk me through what happens, step by step, when you deploy a new version of a service with zero downtime.', ['rolling / blue-green', 'health checks / readiness', 'rollback', 'connection draining'], 'deployment'),
        tech('You get paged: a service has high latency. What are your first few steps?', ['triage / dashboards', 'recent changes', 'saturation (CPU/mem/IO)', 'mitigate then root-cause'], 'incident'),
      ],
      scenario: [tech('How would you set up alerting that catches real problems without paging people for noise?', ['SLOs / symptoms not causes', 'thresholds', 'severity', 'runbooks'], 'observability')],
      behavioral: [beh('Tell me about an incident you helped resolve. What was your specific role?', ['ownership', 'specific actions', 'outcome / learning'])],
      eq: [], whiteboard: [],
    },
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    category: 'Data',
    skills: ['ML', 'Statistics', 'Python', 'Experimentation'],
    durationMin: 7, accent: 'Neutral (global)', language: 'English',
    blurb: 'Applied ML — framing problems, models and honest evaluation.',
    jdText: 'A data scientist framing business problems as ML, with rigorous evaluation and experimentation.',
    questions: {
      technical: [
        tech('A product team wants to "predict churn." How do you turn that into a well-posed ML problem?', ['label definition', 'features / leakage', 'baseline', 'metric tied to business'], 'ml-framing'),
        tech('Your model has 95% accuracy but the team is unhappy with it in production. What might be going on?', ['class imbalance', 'wrong metric', 'distribution shift', 'precision/recall trade-off'], 'evaluation'),
      ],
      scenario: [tech('How would you design an A/B test to know whether a new recommendation model actually helps?', ['hypothesis + metric', 'randomization', 'sample size / significance', 'guardrail metrics'], 'experimentation')],
      behavioral: [beh('Tell me about a model you took from idea to production. What did you personally own?', ['ownership', 'specific work', 'measured impact'])],
      eq: [], whiteboard: [],
    },
  },
]

export const DEMO_CATEGORIES: DemoCategory[] = ['Backend', 'Frontend', 'Full-Stack', 'Data', 'DevOps']
export function getDemoPersona(slug: string): DemoPersona | undefined { return DEMO_PERSONAS.find((p) => p.slug === slug) }
