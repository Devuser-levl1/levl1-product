// pg-boss job handler — AI-scores a Hire candidate. Wired up in Sprint 1.
export interface ScoreCandidatePayload {
  tenantId: string
  candidateId: string
}

export async function scoreCandidateJob(payload: ScoreCandidatePayload): Promise<void> {
  console.log('[hire/score-candidate] received job for candidate:', payload.candidateId)
  // Sprint 1: load candidate + job, call scoreCandidate(), persist aiScore/aiSummary.
}
