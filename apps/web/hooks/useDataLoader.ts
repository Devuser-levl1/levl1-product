'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export function useDataLoader() {
  const { setPositions, setCandidates, setInterviews } = useAppStore()

  useEffect(() => {
    // Load positions
    fetch('/api/positions')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) {
          setPositions(
            data.map((p: any) => ({
              id: p.id,
              title: p.title,
              company: p.company,
              department: p.department || '',
              experienceLevel: p.experienceLevel,
              techStack: p.techStack || [],
              status: p.status,
              interviewsScheduled:
                p.candidates?.filter((c: any) => c.status === 'scheduled').length || 0,
              interviewsCompleted:
                p.candidates?.filter((c: any) => c.status === 'completed').length || 0,
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
            data.map((c: any) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
              linkedIn: c.linkedIn,
              currentTitle: c.currentTitle,
              currentCompany: c.currentCompany,
              totalYearsExperience: c.totalYears,
              topSkills: c.topSkills || [],
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
            data.map((i: any) => ({
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
