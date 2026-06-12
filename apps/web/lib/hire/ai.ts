// AI helpers for the Hire product. Implemented in Sprint 1 (queued via pg-boss).
import { RESUME_PARSE_PROMPT, CANDIDATE_SCORE_PROMPT } from './prompts'

export interface ParsedResume {
  name: string
  email: string
  phone?: string
  skills: string[]
  summary: string
}

export interface CandidateScore {
  score: number
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
  rationale: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function parseResume(_resumeText: string): Promise<ParsedResume> {
  // Sprint 1: call Claude with RESUME_PARSE_PROMPT.
  void RESUME_PARSE_PROMPT
  throw new Error('parseResume not implemented yet')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function scoreCandidate(_resumeText: string, _jobDescription: string): Promise<CandidateScore> {
  // Sprint 1: call Claude with CANDIDATE_SCORE_PROMPT.
  void CANDIDATE_SCORE_PROMPT
  throw new Error('scoreCandidate not implemented yet')
}
