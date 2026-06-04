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

/* ── Store ──────────────────────────────────────────────────────── */

export const useAppStore = create<AppStore>((set) => ({
  activeSection: 'dashboard',
  setActiveSection: (s) => set({ activeSection: s }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  positions: [],         // populated by useDataLoader from DB; never seed with mocks
  candidates: [],        // populated by useDataLoader from DB; never seed with mocks
  interviews: [],            // populated by useDataLoader from DB
  reports: {},               // populated on-demand when report page loads
  positionReports: {},       // populated on-demand
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
