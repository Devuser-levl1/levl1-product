import { create } from 'zustand'

export type NavSection = 'dashboard' | 'positions' | 'clients' | 'candidates' | 'interviews' | 'reports' | 'settings'

export interface Position {
  id: string
  title: string
  company: string
  department: string
  experienceLevel: string
  techStack: string[]
  status: 'draft' | 'pending_approval' | 'active' | 'paused' | 'closed'
  interviewsScheduled: number
  interviewsCompleted: number
  createdAt: string
  approvals: { techLead: boolean; hr: boolean }
  interviewDuration?: number
  dynamicQuestionIntensity?: 'light' | 'standard' | 'deep'
  voiceAccent?: string
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  linkedIn?: string
  currentTitle?: string
  currentCompany?: string
  totalYearsExperience?: number
  topSkills?: string[]
  educationSummary?: string
  positionId: string
  positionTitle: string
  status: 'pending' | 'invited' | 'scheduled' | 'interviewing' | 'completed' | 'no_show' | 'cancelled'
  scheduledAt?: string
  score?: number
  recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no'
  uploadedAt: string
  invitedAt?: string
  schedulingLink?: string
  remindersSent?: number
  interviewId?: string
  reportGenerated?: boolean
  reportGeneratedAt?: string
}

export interface Interview {
  id: string
  candidateId: string
  candidateName: string
  positionId: string
  positionTitle: string
  scheduledAt: string
  duration: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'no_show'
  agentOnline: boolean
  candidateJoined: boolean
  score?: number
}

/* ── Report types ───────────────────────────────────────────────── */

export interface SectionScore {
  score: number
  outOf: number
}

export interface SectionScores {
  technical: SectionScore
  scenario: SectionScore
  behavioral: SectionScore
  eq: SectionScore
  whiteboard: SectionScore
}

export interface QuestionEvaluation {
  questionId: string
  questionText: string
  questionType: string
  isPreset: boolean
  candidateResponseExcerpt: string
  keyPointsCovered: string[]
  keyPointsMissed: string[]
  score: number          // 0–10
  evaluatorNote: string
}

export interface TranscriptHighlight {
  quote: string
  context: string
}

export interface CandidateReport {
  interviewId: string
  candidateId: string
  positionId: string
  generatedAt: string
  overallScore: number
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
  professionalSummary: string
  sectionScores: SectionScores
  strengthAreas: string[]
  concernAreas: string[]
  questionWiseEvaluation: QuestionEvaluation[]
  transcriptHighlights: TranscriptHighlight[]
  hrNote: string
  l2Recommendation: string
  // Metadata
  candidateName: string
  candidateEmail: string
  positionTitle: string
  company: string
  interviewDate: string
  duration: number
}

export interface PositionReport {
  positionId: string
  generatedAt: string
  poolStrengths: string[]
  poolGaps: string[]
  marketObservation: string
  questionHealthFlags: Array<{
    questionText: string
    reason: string
    recommendation: string
  }>
  hiringRecommendation: string
}

/* ── Keep legacy alias for any existing usage ───────────────────── */
export type PositionSummaryReport = PositionReport

/* ── Interview Session ──────────────────────────────────────────── */

export type InterviewPhase =
  | 'waiting'
  | 'intro'
  | 'questioning'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'closing'
  | 'completed'

export interface TranscriptEntry {
  id: string
  timestamp: string
  speaker: 'ai' | 'candidate'
  text: string
  questionId?: string
  type: 'intro' | 'preset' | 'dynamic' | 'followup' | 'transition' | 'closing'
}

export interface QuestionResponse {
  questionId: string
  questionText: string
  questionType: string
  isPreset: boolean
  candidateResponse: string
  score: number
  keyPointsCovered: string[]
  keyPointsMissed: string[]
  evaluatorNote: string
  timeSpent: number
}

export interface InterviewSession {
  interviewId: string
  candidateId: string
  positionId: string
  phase: InterviewPhase
  startedAt: string
  elapsedSeconds: number
  transcript: TranscriptEntry[]
  questionResponses: QuestionResponse[]
  codeEditorContent: string
  codeEditorLanguage: string
  whiteboardImageUrl?: string
  runningScore: number
  currentQuestionIndex: number
  dynamicQuestionsGenerated: number
  candidateTabSwitches: number
}

/* ── Agency plan (subscription / trial state) ───────────────────── */
export interface AgencyPlan {
  agencyId:        string
  agencyName:      string
  plan:            'trial' | 'starter' | 'professional' | 'enterprise' | 'expired'
  interviewsUsed:  number
  interviewsLimit: number
  trialExpiresAt:  string | null   // ISO string
  trialDaysLeft:   number
  subscriptionStatus: string | null
}

/* ── Store interface ────────────────────────────────────────────── */

interface AppStore {
  activeSection: NavSection
  setActiveSection: (s: NavSection) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  positions: Position[]
  candidates: Candidate[]
  interviews: Interview[]
  reports: Record<string, CandidateReport>
  positionReports: Record<string, PositionReport>
  setPositions: (positions: Position[]) => void
  setCandidates: (candidates: Candidate[]) => void
  setInterviews: (interviews: Interview[]) => void
  addPosition: (p: Position) => void
  addCandidates: (candidates: Candidate[]) => void
  updateCandidate: (id: string, updates: Partial<Candidate>) => void
  removeCandidate: (id: string) => void
  updateInterview: (id: string, updates: Partial<Interview>) => void
  addInterview: (iv: Interview) => void
  addReport: (interviewId: string, report: CandidateReport) => void
  addPositionReport: (positionId: string, report: PositionReport) => void
  showNewPositionFlow: boolean
  setShowNewPositionFlow: (v: boolean) => void
  showUploadFlow: boolean
  setShowUploadFlow: (v: boolean) => void
  /* Agency plan */
  agencyPlan: AgencyPlan | null
  setAgencyPlan: (plan: AgencyPlan | null) => void
  showUpgradeWall: boolean
  setShowUpgradeWall: (v: boolean) => void
  /* Interview session */
  activeSession: InterviewSession | null
  setActiveSession: (session: InterviewSession | null) => void
  updateSessionPhase: (phase: InterviewPhase) => void
  appendTranscriptEntry: (entry: TranscriptEntry) => void
  upsertQuestionResponse: (response: QuestionResponse) => void
  updateSessionScore: (score: number) => void
  updateSessionCode: (content: string, language: string) => void
  updateSessionWhiteboard: (url: string) => void
  incrementTabSwitch: () => void
}

/* ── Mock data ──────────────────────────────────────────────────── */

const MOCK_POSITIONS: Position[] = [
  { id: 'p1', title: 'Technology Manager — Business Intelligence', company: 'FinEdge Technologies', department: 'Data & Analytics', experienceLevel: '8–12 years', techStack: ['Snowflake', 'dbt', 'Tableau', 'Airflow', 'Python'], status: 'active', interviewsScheduled: 4, interviewsCompleted: 7, createdAt: '2026-05-10', approvals: { techLead: true, hr: true }, interviewDuration: 45, dynamicQuestionIntensity: 'standard' },
  { id: 'p2', title: 'IT Risk & Compliance Manager', company: 'SecureAxis Technologies', department: 'GRC', experienceLevel: '8–12 years', techStack: ['SOX ITGC', 'SOC 2', 'HITRUST', 'Vanta', 'AuditBoard'], status: 'pending_approval', interviewsScheduled: 0, interviewsCompleted: 0, createdAt: '2026-05-22', approvals: { techLead: true, hr: false }, interviewDuration: 30 },
  { id: 'p3', title: 'Senior Data Engineer', company: 'PayScale India', department: 'Engineering', experienceLevel: '5–8 years', techStack: ['Spark', 'Kafka', 'Databricks', 'Python', 'AWS'], status: 'active', interviewsScheduled: 2, interviewsCompleted: 3, createdAt: '2026-05-05', approvals: { techLead: true, hr: true }, interviewDuration: 30, dynamicQuestionIntensity: 'light' },
  { id: 'p4', title: 'Product Manager — Payments', company: 'RazorPay', department: 'Product', experienceLevel: '4–7 years', techStack: ['Product Strategy', 'SQL', 'Figma', 'Agile', 'APIs'], status: 'draft', interviewsScheduled: 0, interviewsCompleted: 0, createdAt: '2026-05-24', approvals: { techLead: false, hr: false }, interviewDuration: 30 },
]

const MOCK_CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Rohan Krishnamurthy', email: 'rohan.k@email.com', phone: '+91 98765 43210', currentTitle: 'BI Manager', currentCompany: 'TechCorp', totalYearsExperience: 10, topSkills: ['Snowflake', 'dbt', 'Tableau'], positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'completed', scheduledAt: '2026-05-20T10:00:00', score: 82, recommendation: 'yes', uploadedAt: '2026-05-15', interviewId: 'i-rohan', reportGenerated: true, reportGeneratedAt: '2026-05-20T11:32:00' },
  { id: 'c2', name: 'Archita Mishra', email: 'archita.mishra@email.com', currentTitle: 'GRC Analyst', currentCompany: 'SecureAxis', totalYearsExperience: 9, topSkills: ['SOX ITGC', 'SOC 2'], positionId: 'p2', positionTitle: 'IT Risk & Compliance Manager', status: 'scheduled', scheduledAt: '2026-05-26T14:30:00', uploadedAt: '2026-05-22', invitedAt: '2026-05-22', schedulingLink: 'https://cal.com/mock/archita', interviewId: 'i1' },
  { id: 'c3', name: 'Priya Venkatesh', email: 'priya.v@email.com', totalYearsExperience: 8, topSkills: ['Tableau', 'Python', 'Airflow'], positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'completed', scheduledAt: '2026-05-19T11:00:00', score: 74, recommendation: 'maybe', uploadedAt: '2026-05-14', interviewId: 'i-priya', reportGenerated: true, reportGeneratedAt: '2026-05-19T12:18:00' },
  { id: 'c4', name: 'Karan Mehta', email: 'karan.m@email.com', currentTitle: 'Data Engineer', currentCompany: 'PayScale', totalYearsExperience: 6, topSkills: ['Spark', 'Kafka', 'Python'], positionId: 'p3', positionTitle: 'Senior Data Engineer', status: 'scheduled', scheduledAt: '2026-05-27T10:00:00', uploadedAt: '2026-05-23', invitedAt: '2026-05-23', interviewId: 'i2' },
  { id: 'c5', name: 'Divya Sharma', email: 'divya.s@email.com', totalYearsExperience: 11, topSkills: ['Snowflake', 'dbt', 'Python'], positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'completed', score: 91, recommendation: 'strong_yes', uploadedAt: '2026-05-12', interviewId: 'i-divya', reportGenerated: true, reportGeneratedAt: '2026-05-18T15:45:00', scheduledAt: '2026-05-18T14:00:00' },
  { id: 'c6', name: 'Arun Nair', email: 'arun.n@email.com', totalYearsExperience: 5, topSkills: ['Kafka', 'Databricks'], positionId: 'p3', positionTitle: 'Senior Data Engineer', status: 'no_show', scheduledAt: '2026-05-21T09:00:00', uploadedAt: '2026-05-16' },
  { id: 'c7', name: 'Sneha Iyer', email: 'sneha.iyer@email.com', currentTitle: 'Data Engineer II', currentCompany: 'Amazon', totalYearsExperience: 5, topSkills: ['Spark', 'AWS', 'Python'], positionId: 'p3', positionTitle: 'Senior Data Engineer', status: 'pending', uploadedAt: '2026-05-25' },
  { id: 'c8', name: 'Vikram Rajan', email: 'vikram.r@email.com', currentTitle: 'Analytics Lead', currentCompany: 'Flipkart', totalYearsExperience: 9, topSkills: ['Snowflake', 'Looker', 'dbt'], positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'pending', uploadedAt: '2026-05-25' },
]

const MOCK_INTERVIEWS: Interview[] = [
  { id: 'i1', candidateId: 'c2', candidateName: 'Archita Mishra', positionId: 'p2', positionTitle: 'IT Risk & Compliance Manager', scheduledAt: '2026-05-26T14:30:00', duration: 45, status: 'scheduled', agentOnline: true, candidateJoined: false },
  { id: 'i2', candidateId: 'c4', candidateName: 'Karan Mehta', positionId: 'p3', positionTitle: 'Senior Data Engineer', scheduledAt: '2026-05-27T10:00:00', duration: 30, status: 'scheduled', agentOnline: false, candidateJoined: false },
]

/* ── Mock question evaluations (shared template for p1 role) ──── */
const BI_QUESTIONS: QuestionEvaluation[] = [
  {
    questionId: 'q1',
    questionText: 'Walk me through your experience with Snowflake and how you have optimised warehouse costs in a production environment.',
    questionType: 'Technical',
    isPreset: true,
    candidateResponseExcerpt: '',
    keyPointsCovered: [],
    keyPointsMissed: [],
    score: 0,
    evaluatorNote: '',
  },
  {
    questionId: 'q2',
    questionText: 'Design a real-time analytics pipeline for a fintech company processing 10 million daily transactions with data freshness under 5 minutes.',
    questionType: 'Scenario',
    isPreset: true,
    candidateResponseExcerpt: '',
    keyPointsCovered: [],
    keyPointsMissed: [],
    score: 0,
    evaluatorNote: '',
  },
  {
    questionId: 'q3',
    questionText: 'Tell me about a time you had to influence senior stakeholders to prioritise technical debt reduction over new feature delivery.',
    questionType: 'Behavioral',
    isPreset: true,
    candidateResponseExcerpt: '',
    keyPointsCovered: [],
    keyPointsMissed: [],
    score: 0,
    evaluatorNote: '',
  },
  {
    questionId: 'q4',
    questionText: 'How do you handle a situation where two senior engineers on your team have a strong disagreement on the technical approach for a critical project?',
    questionType: 'EQ',
    isPreset: true,
    candidateResponseExcerpt: '',
    keyPointsCovered: [],
    keyPointsMissed: [],
    score: 0,
    evaluatorNote: '',
  },
  {
    questionId: 'q5',
    questionText: 'Walk me through your approach to implementing a data mesh architecture for an organisation currently running a centralised data lake.',
    questionType: 'Dynamic',
    isPreset: false,
    candidateResponseExcerpt: '',
    keyPointsCovered: [],
    keyPointsMissed: [],
    score: 0,
    evaluatorNote: '',
  },
]

/* ── Mock reports ───────────────────────────────────────────────── */

const MOCK_REPORTS: Record<string, CandidateReport> = {
  'i-divya': {
    interviewId: 'i-divya',
    candidateId: 'c5',
    positionId: 'p1',
    generatedAt: '2026-05-18T15:45:00',
    overallScore: 91,
    recommendation: 'strong_yes',
    candidateName: 'Divya Sharma',
    candidateEmail: 'divya.s@email.com',
    positionTitle: 'Technology Manager — Business Intelligence',
    company: 'FinEdge Technologies',
    interviewDate: '18 May 2026',
    duration: 44,
    professionalSummary: 'Divya Sharma is an accomplished Business Intelligence leader with over 11 years of experience designing and scaling enterprise data platforms. During the interview, she demonstrated exceptional depth in Snowflake architecture, citing a specific ₹18 lakh compute cost reduction achieved through warehouse right-sizing and auto-suspend policy tuning at her current organisation. Her communication style was consistently structured and executive-ready, translating complex technical trade-offs into clear business outcomes throughout the session. She demonstrated strong cross-functional leadership experience, describing how she aligned stakeholders across Finance, Engineering, and Product to deliver a data platform migration with zero downtime. Divya is a standout candidate who would bring immediate impact to the Technology Manager — BI role at FinEdge Technologies.',
    sectionScores: {
      technical:  { score: 88, outOf: 100 },
      scenario:   { score: 92, outOf: 100 },
      behavioral: { score: 94, outOf: 100 },
      eq:         { score: 90, outOf: 100 },
      whiteboard: { score: 82, outOf: 100 },
    },
    strengthAreas: [
      'Deep Snowflake expertise — cited a specific ₹18L compute cost reduction through warehouse right-sizing and auto-suspend tuning',
      'Strong dbt pipeline architecture — described complex multi-layer transformation DAGs with tests and documentation discipline',
      'Exceptional stakeholder communication — articulated technical trade-offs clearly for Finance and Product leadership',
      'Proven large-scale delivery — led a data platform migration for 50M+ daily events with zero downtime and rollback strategy',
    ],
    concernAreas: [
      'Limited exposure to RBI regulatory reporting — acknowledged unfamiliarity when specifically probed on NBFC compliance data flows',
      'Whiteboard system design did not address backpressure handling and consumer lag under burst traffic scenarios',
    ],
    questionWiseEvaluation: [
      {
        ...BI_QUESTIONS[0],
        candidateResponseExcerpt: 'We right-sized our XL warehouse to a cluster of M warehouses and implemented auto-suspend at 60 seconds — cut our monthly compute bill by ₹18 lakhs without impacting SLA.',
        keyPointsCovered: ['Warehouse sizing strategy', 'Auto-suspend configuration', 'Cost quantification with real numbers', 'SLA impact assessment'],
        keyPointsMissed: ['Query result caching strategy', 'Resource monitoring via Snowflake dashboards'],
        score: 9,
        evaluatorNote: 'Exceptionally strong answer with specific rupee-value impact. Candidate demonstrated practical cost governance experience rare at this level.',
      },
      {
        ...BI_QUESTIONS[1],
        candidateResponseExcerpt: 'I would use Kafka as the ingestion layer, stream into Snowflake via Snowpipe with micro-batching at 30-second intervals, then expose aggregated views through Tableau with 5-minute refresh schedules.',
        keyPointsCovered: ['Streaming ingestion layer (Kafka)', 'Snowpipe micro-batching', 'Refresh schedule alignment with SLA', 'Presentation layer consideration'],
        keyPointsMissed: ['Dead letter queue / error handling', 'Consumer group strategy for fault tolerance', 'Schema evolution handling'],
        score: 9,
        evaluatorNote: 'Solid architecture with good technology choices. Minor gaps in fault tolerance design but overall approach is production-ready.',
      },
      {
        ...BI_QUESTIONS[2],
        candidateResponseExcerpt: 'I documented the cost of tech debt in business terms — we had three incidents in Q2 caused by the legacy pipeline. I presented the risk in terms of SLA penalties and brought Finance in to quantify the exposure. That shifted the conversation entirely.',
        keyPointsCovered: ['Translating tech debt into business risk', 'Cross-functional alignment (Finance)', 'Data-driven persuasion', 'Outcome focus'],
        keyPointsMissed: [],
        score: 9,
        evaluatorNote: 'Excellent answer demonstrating strategic influence skills. Specific, credible, and outcome-oriented — exactly what a Tech Manager role demands.',
      },
      {
        ...BI_QUESTIONS[3],
        candidateResponseExcerpt: 'I bring both engineers into a structured session to map out the trade-offs on a whiteboard together. My role is to facilitate, not arbitrate. I ask each to stress-test the other\'s approach. Usually the best answer emerges from the synthesis.',
        keyPointsCovered: ['Structured conflict resolution', 'Facilitation approach', 'Encouraging synthesis over winning'],
        keyPointsMissed: ['Escalation path if consensus not reached', 'Timeline management when teams are blocked'],
        score: 8,
        evaluatorNote: 'Mature and thoughtful approach to team conflict. Slightly light on escalation strategy but the facilitation model described is well-reasoned.',
      },
      {
        ...BI_QUESTIONS[4],
        candidateResponseExcerpt: 'I\'ve read about data mesh but haven\'t implemented it end-to-end. I understand the domain ownership concept — each team owns their data product — but at my current org we\'re still centralised.',
        keyPointsCovered: ['Domain ownership model awareness', 'Data product concept recognition'],
        keyPointsMissed: ['Data product interface design', 'Federated governance patterns', 'Self-serve infrastructure', 'Migration strategy from centralised to mesh'],
        score: 7,
        evaluatorNote: 'Candidate was transparent about limited hands-on experience, which is credible. Conceptual understanding present but implementation depth is a watch area.',
      },
    ],
    transcriptHighlights: [
      { quote: 'The most impactful thing I did was reduce Snowflake compute costs by ₹18 lakhs through warehouse right-sizing — we moved from a single XL warehouse to clustered M warehouses with 60-second auto-suspend.', context: 'Technical section — Q1: Snowflake cost optimisation' },
      { quote: 'My role as a manager is to facilitate, not to win. I bring the engineers to a whiteboard and ask each of them to stress-test the other\'s approach. The best solution usually emerges from that tension.', context: 'EQ section — Q4: Handling team technical disagreements' },
      { quote: 'I translated the tech debt risk into SLA penalty exposure. When Finance saw the numbers, the prioritisation conversation changed completely.', context: 'Behavioral section — Q3: Stakeholder influence' },
    ],
    hrNote: 'Divya is a strong, well-rounded technical leader with proven delivery experience in BI modernisation at enterprise scale. Her communication is polished and executive-ready — she can operate both as a hands-on architect and as a senior stakeholder manager. Main watch area is data mesh and RBI regulatory reporting; recommend probing these in L2. Overall a very strong fit for the Technology Manager — BI role.',
    l2Recommendation: 'Focus the L2 session on: (1) Data mesh strategy — probe whether she can lead an org-wide transition from centralised to mesh; (2) RBI regulatory reporting — assess whether she can ramp on NBFC compliance data flows; (3) Team building — explore how she has hired and grown BI engineers from scratch.',
  },

  'i-rohan': {
    interviewId: 'i-rohan',
    candidateId: 'c1',
    positionId: 'p1',
    generatedAt: '2026-05-20T11:32:00',
    overallScore: 82,
    recommendation: 'yes',
    candidateName: 'Rohan Krishnamurthy',
    candidateEmail: 'rohan.k@email.com',
    positionTitle: 'Technology Manager — Business Intelligence',
    company: 'FinEdge Technologies',
    interviewDate: '20 May 2026',
    duration: 43,
    professionalSummary: 'Rohan Krishnamurthy is a seasoned Business Intelligence leader with 10 years of progressive experience in data platform engineering and team leadership. He demonstrated solid Snowflake expertise during the technical section, covering clustering strategies, materialised views, and cost governance frameworks. His scenario responses were structured and showed good architectural reasoning, though some answers lacked the specificity and quantified outcomes expected at a principal level. Behavioural answers were well-intentioned but relied on general frameworks rather than concrete examples. Rohan is a credible candidate for the Technology Manager — BI role and would benefit from further evaluation of his data mesh understanding and regulatory exposure in a follow-up interview.',
    sectionScores: {
      technical:  { score: 78, outOf: 100 },
      scenario:   { score: 85, outOf: 100 },
      behavioral: { score: 72, outOf: 100 },
      eq:         { score: 76, outOf: 100 },
      whiteboard: { score: 70, outOf: 100 },
    },
    strengthAreas: [
      'Solid Snowflake depth — described clustering, materialised views, and cost governance with practical context',
      'Clear structured communication — responses consistently followed a logical, easy-to-follow structure',
      'Strong scenario architecture — designed a multi-tier ingestion pipeline with appropriate trade-off reasoning',
    ],
    concernAreas: [
      'Data mesh experience absent — could not describe domain ownership patterns or data product interface design',
      'RBI regulatory reporting not mentioned in either technical or scenario sections when directly probed',
      'Behavioral responses lacked specificity — used general frameworks without concrete outcomes or numbers',
    ],
    questionWiseEvaluation: [
      {
        ...BI_QUESTIONS[0],
        candidateResponseExcerpt: 'We used Snowflake\'s resource monitors to cap spend per warehouse, and set up clustering keys on our largest fact tables to reduce the number of micro-partitions scanned per query.',
        keyPointsCovered: ['Resource monitor configuration', 'Clustering key strategy', 'Micro-partition pruning awareness'],
        keyPointsMissed: ['Quantified cost impact', 'Auto-suspend / auto-resume policies', 'Warehouse sizing decisions'],
        score: 8,
        evaluatorNote: 'Good technical depth on Snowflake internals but lacked a concrete cost outcome. Credible understanding of platform governance.',
      },
      {
        ...BI_QUESTIONS[1],
        candidateResponseExcerpt: 'I\'d use Kafka for streaming ingestion, Flink for stateful stream processing, land aggregated results in Snowflake, then expose via Tableau. I\'d target Snowpipe for direct streaming inserts to keep latency under 2 minutes.',
        keyPointsCovered: ['Streaming ingestion (Kafka)', 'Stateful stream processing (Flink)', 'Sub-5-minute latency strategy', 'Presentation layer'],
        keyPointsMissed: ['Dead letter queue', 'Consumer lag monitoring', 'Schema evolution handling'],
        score: 8,
        evaluatorNote: 'Solid pipeline design with appropriate technology choices. Good latency reasoning. Minor gaps in operational concerns.',
      },
      {
        ...BI_QUESTIONS[2],
        candidateResponseExcerpt: 'I typically use a framework to present tech debt — I map it to business risk and potential cost. I had a similar situation where I worked with the product team to carve out 20% sprint capacity for debt reduction.',
        keyPointsCovered: ['Tech debt as business risk framing', 'Cross-team negotiation'],
        keyPointsMissed: ['Specific outcome or metric', 'Finance or executive stakeholder engagement', 'Data to back the business case'],
        score: 6,
        evaluatorNote: 'Answer describes a reasonable approach but is general. No specific outcome or quantified impact was provided — a gap for a principal-level candidate.',
      },
      {
        ...BI_QUESTIONS[3],
        candidateResponseExcerpt: 'I schedule a meeting with both engineers, let each explain their approach, then work with the team to evaluate on a set of criteria — scalability, maintainability, and timeline. Then we vote.',
        keyPointsCovered: ['Structured evaluation criteria', 'Inclusive decision process'],
        keyPointsMissed: ['Facilitation vs. arbitration distinction', 'Synthesis approach', 'Escalation path if criteria evaluation is inconclusive'],
        score: 7,
        evaluatorNote: 'Adequate conflict resolution approach. Voting mechanism is functional but may not always produce the best engineering outcome. Moderate EQ signal.',
      },
      {
        ...BI_QUESTIONS[4],
        candidateResponseExcerpt: 'Data mesh is on my learning roadmap. I understand the concept — domain teams own their data products — but we haven\'t implemented it at my current company. We\'re centralised.',
        keyPointsCovered: ['Domain ownership concept'],
        keyPointsMissed: ['Data product interface design', 'Federated computational governance', 'Self-serve data infrastructure', 'Migration planning'],
        score: 5,
        evaluatorNote: 'Minimal hands-on experience with data mesh. Conceptual awareness only. This is a concern if data mesh is on the roadmap for FinEdge.',
      },
    ],
    transcriptHighlights: [
      { quote: 'We used Snowflake\'s resource monitors to cap spend per warehouse and clustering keys on our largest fact tables to reduce micro-partition scans — that was our primary cost lever.', context: 'Technical section — Q1: Snowflake cost optimisation' },
      { quote: 'I map tech debt to business risk and potential cost — that\'s the language product and leadership respond to. Worked with product to carve 20% sprint capacity for debt reduction.', context: 'Behavioral section — Q3: Stakeholder influence' },
      { quote: 'Data mesh is on my learning roadmap. We haven\'t implemented it yet at my current org — we\'re still centralised.', context: 'Dynamic section — Q5: Data mesh architecture' },
    ],
    hrNote: 'Rohan is a solid technical candidate with good Snowflake expertise and clear communication skills. He handles scenario questions well and his architecture thinking is sound. Main gaps are data mesh hands-on experience and the absence of regulatory reporting context. Behavioral answers lacked the specificity expected at a principal level — recommend exploring concrete leadership outcomes in L2. A good second choice behind stronger candidates.',
    l2Recommendation: 'Focus the L2 on: (1) Specific leadership outcomes — ask him to quantify team results and delivery impact with hard numbers; (2) Data mesh — probe whether he can ramp on this independently; (3) Regulatory data — assess RBI NBFC reporting exposure or willingness to learn.',
  },

  'i-priya': {
    interviewId: 'i-priya',
    candidateId: 'c3',
    positionId: 'p1',
    generatedAt: '2026-05-19T12:18:00',
    overallScore: 74,
    recommendation: 'maybe',
    candidateName: 'Priya Venkatesh',
    candidateEmail: 'priya.v@email.com',
    positionTitle: 'Technology Manager — Business Intelligence',
    company: 'FinEdge Technologies',
    interviewDate: '19 May 2026',
    duration: 41,
    professionalSummary: 'Priya Venkatesh brings 8 years of analytics and BI experience with strong Tableau and Python skills demonstrated clearly during the interview. She showed good stakeholder communication abilities, describing a well-structured executive dashboard delivery project with measurable adoption outcomes. Her technical answers were competent at an analyst level but did not demonstrate the architectural depth typically expected of a Technology Manager. She acknowledged limited Snowflake experience and no prior dbt exposure, which are significant gaps for this role. Her whiteboard session lacked layered architecture clarity. Priya may be well-suited for a Senior BI Analyst or Lead Analyst role, but the Technology Manager position requires stronger platform engineering depth.',
    sectionScores: {
      technical:  { score: 71, outOf: 100 },
      scenario:   { score: 74, outOf: 100 },
      behavioral: { score: 77, outOf: 100 },
      eq:         { score: 79, outOf: 100 },
      whiteboard: { score: 62, outOf: 100 },
    },
    strengthAreas: [
      'Strong Tableau expertise — demonstrated advanced LOD calculations, set actions, and cross-datasource joins in production context',
      'Good stakeholder communication — described an executive dashboard initiative with clear adoption and engagement metrics',
      'Mature EQ — handled team conflict scenario with a structured, empathy-first approach',
    ],
    concernAreas: [
      'Limited Snowflake experience — described only basic query optimisation without warehousing or architectural depth',
      'No dbt exposure — acknowledged unfamiliarity with transformation pipeline tooling when asked directly',
      'Whiteboard system design lacked architectural layers — did not distinguish ingestion, transformation, serving, and consumption tiers',
      'Scenario answers stayed at analyst level — did not address system reliability, SLA guarantees, or operational concerns',
    ],
    questionWiseEvaluation: [
      {
        ...BI_QUESTIONS[0],
        candidateResponseExcerpt: 'We use Snowflake for our data warehouse. I\'ve done some query tuning — adding WHERE clauses to reduce data scanned, and creating summary tables for frequently run reports.',
        keyPointsCovered: ['Query optimisation awareness', 'Summary table pre-aggregation pattern'],
        keyPointsMissed: ['Warehouse sizing and cost governance', 'Clustering keys', 'Auto-suspend/resume policies', 'Resource monitors', 'Cost quantification'],
        score: 6,
        evaluatorNote: 'Answer reflects analyst-level Snowflake experience. No cost governance, architecture, or platform administration depth demonstrated.',
      },
      {
        ...BI_QUESTIONS[1],
        candidateResponseExcerpt: 'I would build a pipeline using Airflow to orchestrate data pulls from the transaction system, load into a staging layer, run transformations, and then publish to Tableau dashboards on a 10-minute refresh cycle.',
        keyPointsCovered: ['Airflow orchestration familiarity', 'Staging layer pattern', 'Dashboard refresh consideration'],
        keyPointsMissed: ['Streaming vs. batch distinction for 5-min SLA', 'Kafka or event streaming layer', 'Latency guarantee mechanism', 'Error handling and alerting'],
        score: 7,
        evaluatorNote: 'Reasonable batch pipeline design but the 5-minute SLA requirement called for streaming — the candidate did not address this distinction.',
      },
      {
        ...BI_QUESTIONS[2],
        candidateResponseExcerpt: 'I built a case by showing how the legacy dashboard took 4 hours to run every morning and was blocking the analyst team. I showed the business that time had a cost — and got the prioritisation.',
        keyPointsCovered: ['Quantifying tech debt impact in business terms', 'Stakeholder persuasion', 'Concrete outcome'],
        keyPointsMissed: [],
        score: 8,
        evaluatorNote: 'Strong behavioral answer with a specific, credible example. Good instinct for translating technical pain into business language.',
      },
      {
        ...BI_QUESTIONS[3],
        candidateResponseExcerpt: 'I listen to both sides carefully, acknowledge that both perspectives have merit, and then try to find the common ground. I\'d also suggest a short spike to test both approaches if we can\'t agree quickly.',
        keyPointsCovered: ['Active listening', 'Acknowledging both perspectives', 'Proof of concept / spike approach'],
        keyPointsMissed: ['Structured criteria evaluation', 'Escalation path', 'Timeline management'],
        score: 8,
        evaluatorNote: 'Thoughtful EQ response. The spike suggestion is a practical engineering tool. Good empathy signal.',
      },
      {
        ...BI_QUESTIONS[4],
        candidateResponseExcerpt: 'I\'m familiar with the data mesh concept from conferences and blog posts but haven\'t worked on a data mesh project directly. I understand it\'s about decentralising data ownership to domain teams.',
        keyPointsCovered: ['Domain ownership awareness'],
        keyPointsMissed: ['Data product design', 'Federated governance', 'Self-serve infrastructure', 'Migration path from centralised lake'],
        score: 5,
        evaluatorNote: 'Surface-level conceptual awareness only. No implementation or design depth. A concern for a manager-level role focused on platform architecture.',
      },
    ],
    transcriptHighlights: [
      { quote: 'I showed the business that the legacy dashboard took 4 hours every morning and was blocking the analyst team — time has a cost, and that reframing got the prioritisation I needed.', context: 'Behavioral section — Q3: Stakeholder influence' },
      { quote: 'I\'d suggest a short spike — let both engineers test their approach in a sandbox for a sprint. The data usually makes the decision clearer than the debate.', context: 'EQ section — Q4: Team conflict resolution' },
      { quote: 'I\'m familiar with data mesh from conferences and blog posts but haven\'t worked on one directly.', context: 'Dynamic section — Q5: Data mesh architecture' },
    ],
    hrNote: 'Priya is a capable BI professional with strong Tableau skills and solid stakeholder communication. However, her technical depth in Snowflake, dbt, and platform architecture is below the bar for a Technology Manager role. She would be a strong Senior BI Analyst or Lead. If the team is open to a longer runway candidate, she could develop into the manager role over 12–18 months — but for an immediate fill, she is a risk.',
    l2Recommendation: 'Only proceed to L2 if the hiring team is open to a development hire. Focus on: (1) Depth of Snowflake exposure — is she actively building this skill?; (2) Platform architecture understanding — can she describe end-to-end data platform design?; (3) Team management experience — how many engineers has she led?',
  },
}

const MOCK_POSITION_REPORTS: Record<string, PositionReport> = {
  'p1': {
    positionId: 'p1',
    generatedAt: '2026-05-20T16:00:00',
    poolStrengths: [
      'Strong Snowflake and dbt expertise present in top-tier candidates — Divya and Rohan both demonstrated platform-level depth',
      'Good stakeholder communication skills observed consistently across all three candidates',
      'Airflow and orchestration experience present across the pool, suggesting strong market availability',
    ],
    poolGaps: [
      'Data mesh architecture knowledge weak across all three candidates — none had hands-on implementation experience',
      'RBI regulatory reporting exposure absent from all candidates interviewed — may indicate a market supply gap for this niche',
      'Whiteboard system design depth below expectations at manager level for two of three candidates',
    ],
    marketObservation: 'The BI Manager talent pool in this geography shows strong Snowflake and Tableau depth but consistently weak data mesh and regulatory data experience. This likely reflects a market lag rather than individual candidate shortcomings — data mesh adoption in Indian enterprises is still early. Candidates with both strong platform engineering and regulatory expertise may require a broader search or a premium compensation package to attract.',
    questionHealthFlags: [
      {
        questionText: 'Walk me through your approach to implementing a data mesh architecture for an organisation currently running a centralised data lake.',
        reason: 'All 3 candidates scored 5–7 out of 10, with no candidate demonstrating hands-on implementation experience.',
        recommendation: 'Consider making this question optional or reframing it as "describe your awareness of data mesh and how you would approach learning it." If data mesh is a hard requirement, expand the search geography.',
      },
      {
        questionText: 'Describe your experience with RBI regulatory reporting data flows.',
        reason: '3 of 3 candidates had no relevant regulatory reporting experience and the question generated very short, unproductive responses.',
        recommendation: 'Reframe as a scenario question testing analytical thinking rather than specific regulatory knowledge, unless NBFC compliance is a hard day-one requirement.',
      },
    ],
    hiringRecommendation: 'Recommend proceeding with Divya Sharma (91) as the primary candidate — she is a clear standout with strong technical depth, proven delivery at scale, and excellent stakeholder communication. Rohan Krishnamurthy (82) is a credible second choice for L2. Priya Venkatesh (74) is not recommended for this specific role at the manager level but could be referred for a Senior BI Analyst opening. Suggest issuing an L2 invite to Divya within 48 hours to maintain momentum.',
  },
}

/* ── Store ──────────────────────────────────────────────────────── */

export const useAppStore = create<AppStore>((set) => ({
  activeSection: 'dashboard',
  setActiveSection: (s) => set({ activeSection: s }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  positions: [],         // populated by useDataLoader from DB; never seed with mocks
  candidates: [],        // populated by useDataLoader from DB; never seed with mocks
  interviews: MOCK_INTERVIEWS,
  reports: MOCK_REPORTS,
  positionReports: MOCK_POSITION_REPORTS,
  setPositions: (positions) => set({ positions }),
  setCandidates: (candidates) => set({ candidates }),
  setInterviews: (interviews) => set({ interviews }),
  addPosition: (p) => set((state) => ({ positions: [p, ...state.positions] })),
  addCandidates: (newCandidates) => set((state) => ({ candidates: [...newCandidates, ...state.candidates] })),
  updateCandidate: (id, updates) => set((state) => ({
    candidates: state.candidates.map((c) => c.id === id ? { ...c, ...updates } : c),
  })),
  removeCandidate: (id) => set((state) => ({ candidates: state.candidates.filter((c) => c.id !== id) })),
  updateInterview: (id, updates) => set((state) => ({
    interviews: state.interviews.map((i) => i.id === id ? { ...i, ...updates } : i),
  })),
  addInterview: (iv) => set((state) => ({
    interviews: [...state.interviews, iv],
  })),
  addReport: (interviewId, report) => set((state) => ({
    reports: { ...state.reports, [interviewId]: report },
  })),
  addPositionReport: (positionId, report) => set((state) => ({
    positionReports: { ...state.positionReports, [positionId]: report },
  })),
  showNewPositionFlow: false,
  setShowNewPositionFlow: (v) => set({ showNewPositionFlow: v }),
  showUploadFlow: false,
  setShowUploadFlow: (v) => set({ showUploadFlow: v }),
  /* Agency plan */
  agencyPlan: null,
  setAgencyPlan: (plan) => set({ agencyPlan: plan }),
  showUpgradeWall: false,
  setShowUpgradeWall: (v) => set({ showUpgradeWall: v }),
  /* Interview session */
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
  updateSessionPhase: (phase) => set((state) => ({
    activeSession: state.activeSession ? { ...state.activeSession, phase } : null,
  })),
  appendTranscriptEntry: (entry) => set((state) => ({
    activeSession: state.activeSession
      ? { ...state.activeSession, transcript: [...state.activeSession.transcript, entry] }
      : null,
  })),
  upsertQuestionResponse: (response) => set((state) => {
    if (!state.activeSession) return {}
    const existing = state.activeSession.questionResponses
    const idx = existing.findIndex((r) => r.questionId === response.questionId)
    const updated = idx >= 0
      ? existing.map((r, i) => (i === idx ? response : r))
      : [...existing, response]
    return { activeSession: { ...state.activeSession, questionResponses: updated } }
  }),
  updateSessionScore: (score) => set((state) => ({
    activeSession: state.activeSession ? { ...state.activeSession, runningScore: score } : null,
  })),
  updateSessionCode: (content, language) => set((state) => ({
    activeSession: state.activeSession
      ? { ...state.activeSession, codeEditorContent: content, codeEditorLanguage: language }
      : null,
  })),
  updateSessionWhiteboard: (url) => set((state) => ({
    activeSession: state.activeSession ? { ...state.activeSession, whiteboardImageUrl: url } : null,
  })),
  incrementTabSwitch: () => set((state) => ({
    activeSession: state.activeSession
      ? { ...state.activeSession, candidateTabSwitches: state.activeSession.candidateTabSwitches + 1 }
      : null,
  })),
}))
