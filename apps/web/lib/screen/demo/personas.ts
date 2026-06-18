// ── Demo gallery personas (Build 05, Screen-scoped) ────────────────────────
// Pre-built, pre-approved technical L1 interviews for the no-friction demo.
// GLOBAL / ENTERPRISE framing, neutral/multi-accent voices — deliberately NOT
// an India-SMB HR/Sales/VC mix. Each persona is sized for a SHORT ~5–8 min
// taste (one substantive exercise + a couple of focused turns; the Build-03
// warm-up runs first). Demo duration is intentionally DECOUPLED from the
// 30-minute production envelope.
//
// CONFIG-DRIVEN: add more personas later by appending to DEMO_PERSONAS (data
// only) — the gallery + launch path need no code changes. Starter set is
// exactly three: Backend Engineer, Data Engineer, Full-Stack Engineer.

export type DemoCategory = 'Backend' | 'Data' | 'Full-Stack'

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
]

export const DEMO_CATEGORIES: DemoCategory[] = ['Backend', 'Data', 'Full-Stack']
export function getDemoPersona(slug: string): DemoPersona | undefined { return DEMO_PERSONAS.find((p) => p.slug === slug) }
