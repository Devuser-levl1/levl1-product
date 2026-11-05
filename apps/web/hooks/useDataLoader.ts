'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

// Normalisers: API rows → store rows with every list/string field present, so
// no page ever reads .length / .split / .map on undefined.
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d)

export function useDataLoader() {
  const { setPositions, setCandidates, setInterviews } = useAppStore()

  // Session guard: the dashboard renders from cached store data, so without
  // this a signed-out user (expired cookie, or a HirePilot login that replaced
  // the shared session without Screen access) sees a "live" dashboard and only
  // finds out via an "Unauthenticated" error on their next action.
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401 && typeof window !== 'undefined') {
          window.location.replace('/interviews/login?expired=1')
          return
        }
        // Seed the single source of truth for agency-vs-company UI.
        const d = r.ok ? await r.json().catch(() => null) : null
        if (d?.agency) useAppStore.getState().setAccount({ type: d.agency.accountType === 'agency' || d.agency.accountType === 'company' ? d.agency.accountType : null, orgName: d.agency.name ?? '', user: d.user ? { name: d.user.name ?? '', email: d.user.email ?? '' } : undefined })
      })
      .catch(() => { /* offline — don't bounce */ })
  }, [])

  useEffect(() => {
    // Load positions
    fetch('/api/positions')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          setPositions(
            data.filter((row: unknown) => !!row && typeof row === "object").map((p: any) => ({
              id: p.id,
              title: str(p.title, 'Untitled position'),
              company: str(p.company),
              department: p.department || '',
              experienceLevel: p.experienceLevel,
              techStack: arr<string>(p.techStack),
              status: p.status,
              interviewsScheduled: arr<{ status?: string } | null>(p.candidates).filter((c) => c?.status === 'scheduled').length,
              interviewsCompleted: arr<{ status?: string } | null>(p.candidates).filter((c) => c?.status === 'completed').length,
              createdAt: p.createdAt,
              approvals: {
                techLead: p.techLeadApproved,
                hr: p.hrApproved,
              },
              interviewDuration: p.interviewDuration || 30,
              dynamicQuestionIntensity: p.dynamicIntensity || 'standard',
            })),
          )
        }
      })
      .catch((err) => console.warn('Failed to load positions from DB:', err))

    // Load candidates
    fetch('/api/candidates')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          setCandidates(
            data.filter((row: unknown) => !!row && typeof row === "object").map((c: any) => ({
              id: c.id,
              name: str(c.name, 'Unnamed candidate'),
              email: str(c.email),
              phone: c.phone,
              linkedIn: c.linkedIn,
              currentTitle: c.currentTitle,
              currentCompany: c.currentCompany,
              totalYearsExperience: c.totalYears,
              topSkills: arr<string>(c.topSkills),
              educationSummary: c.educationSummary,
              positionId: c.positionId,
              positionTitle: c.position?.title || '',
              status: c.status,
              scheduledAt: c.scheduledAt,
              score: c.score,
              recommendation: c.recommendation,
              uploadedAt: c.uploadedAt,
              invitedAt: c.invitedAt,
              interviewId: c.interview?.id,
              reportGenerated: !!c.report,
            })),
          )
        }
      })
      .catch((err) => console.warn('Failed to load candidates from DB:', err))

    // Load interviews
    fetch('/api/interviews')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          setInterviews(
            data.filter((row: unknown) => !!row && typeof row === "object").map((i: any) => ({
              id: i.id,
              candidateId: i.candidateId,
              candidateName: i.candidate?.name || '',
              positionId: i.positionId,
              positionTitle: i.position?.title || '',
              scheduledAt: i.scheduledAt || i.createdAt,
              duration: i.duration || 30,
              status: i.status,
              agentOnline: i.agentOnline,
              candidateJoined: i.candidateJoined,
              score: i.runningScore,
            })),
          )
        }
      })
      .catch((err) => console.warn('Failed to load interviews from DB:', err))
  }, [setPositions, setCandidates, setInterviews])
}
