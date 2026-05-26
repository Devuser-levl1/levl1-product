import { create } from 'zustand'

export type NavSection = 'dashboard' | 'positions' | 'candidates' | 'interviews' | 'reports' | 'settings'

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
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  positionId: string
  positionTitle: string
  status: 'pending' | 'scheduled' | 'interviewing' | 'completed' | 'no_show' | 'cancelled'
  scheduledAt?: string
  score?: number
  recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no'
  uploadedAt: string
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

interface AppStore {
  activeSection: NavSection
  setActiveSection: (s: NavSection) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  positions: Position[]
  candidates: Candidate[]
  interviews: Interview[]
}

const MOCK_POSITIONS: Position[] = [
  { id: 'p1', title: 'Technology Manager — Business Intelligence', company: 'FinEdge Technologies', department: 'Data & Analytics', experienceLevel: '8–12 years', techStack: ['Snowflake', 'dbt', 'Tableau', 'Airflow', 'Python'], status: 'active', interviewsScheduled: 4, interviewsCompleted: 7, createdAt: '2026-05-10', approvals: { techLead: true, hr: true } },
  { id: 'p2', title: 'IT Risk & Compliance Manager', company: 'SecureAxis Technologies', department: 'GRC', experienceLevel: '8–12 years', techStack: ['SOX ITGC', 'SOC 2', 'HITRUST', 'Vanta', 'AuditBoard'], status: 'pending_approval', interviewsScheduled: 0, interviewsCompleted: 0, createdAt: '2026-05-22', approvals: { techLead: true, hr: false } },
  { id: 'p3', title: 'Senior Data Engineer', company: 'PayScale India', department: 'Engineering', experienceLevel: '5–8 years', techStack: ['Spark', 'Kafka', 'Databricks', 'Python', 'AWS'], status: 'active', interviewsScheduled: 2, interviewsCompleted: 3, createdAt: '2026-05-05', approvals: { techLead: true, hr: true } },
  { id: 'p4', title: 'Product Manager — Payments', company: 'RazorPay', department: 'Product', experienceLevel: '4–7 years', techStack: ['Product Strategy', 'SQL', 'Figma', 'Agile', 'APIs'], status: 'draft', interviewsScheduled: 0, interviewsCompleted: 0, createdAt: '2026-05-24', approvals: { techLead: false, hr: false } },
]

const MOCK_CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Rohan Krishnamurthy', email: 'rohan.k@email.com', positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'completed', scheduledAt: '2026-05-20T10:00:00', score: 82, recommendation: 'yes', uploadedAt: '2026-05-15' },
  { id: 'c2', name: 'Archita Mishra', email: 'archita.mishra@email.com', positionId: 'p2', positionTitle: 'IT Risk & Compliance Manager', status: 'scheduled', scheduledAt: '2026-05-26T14:30:00', uploadedAt: '2026-05-22' },
  { id: 'c3', name: 'Priya Venkatesh', email: 'priya.v@email.com', positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'completed', scheduledAt: '2026-05-19T11:00:00', score: 74, recommendation: 'maybe', uploadedAt: '2026-05-14' },
  { id: 'c4', name: 'Karan Mehta', email: 'karan.m@email.com', positionId: 'p3', positionTitle: 'Senior Data Engineer', status: 'scheduled', scheduledAt: '2026-05-27T10:00:00', uploadedAt: '2026-05-23' },
  { id: 'c5', name: 'Divya Sharma', email: 'divya.s@email.com', positionId: 'p1', positionTitle: 'Technology Manager — BI', status: 'completed', score: 91, recommendation: 'strong_yes', uploadedAt: '2026-05-12' },
  { id: 'c6', name: 'Arun Nair', email: 'arun.n@email.com', positionId: 'p3', positionTitle: 'Senior Data Engineer', status: 'no_show', scheduledAt: '2026-05-21T09:00:00', uploadedAt: '2026-05-16' },
]

const MOCK_INTERVIEWS: Interview[] = [
  { id: 'i1', candidateId: 'c2', candidateName: 'Archita Mishra', positionId: 'p2', positionTitle: 'IT Risk & Compliance Manager', scheduledAt: '2026-05-26T14:30:00', duration: 45, status: 'scheduled', agentOnline: true, candidateJoined: false },
  { id: 'i2', candidateId: 'c4', candidateName: 'Karan Mehta', positionId: 'p3', positionTitle: 'Senior Data Engineer', scheduledAt: '2026-05-27T10:00:00', duration: 30, status: 'scheduled', agentOnline: false, candidateJoined: false },
]

export const useAppStore = create<AppStore>((set) => ({
  activeSection: 'dashboard',
  setActiveSection: (s) => set({ activeSection: s }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  positions: MOCK_POSITIONS,
  candidates: MOCK_CANDIDATES,
  interviews: MOCK_INTERVIEWS,
}))
