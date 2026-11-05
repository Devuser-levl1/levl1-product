import { prisma } from '@/lib/prisma'
import { resolveMode, hasWorkspace, type InterviewMode } from './modes'
import { sanitizeTask, type WorkSampleTask } from './task'

// Shared server-side lookup for the candidate-facing workspace routes.
// Validated by interviewId (candidate has no session), like the other room
// routes; only accepted while the session is live or just ended.

const GRACE_MS = 10 * 60_000

export interface WorkspaceSession {
  interviewId: string
  mode: InterviewMode
  task: WorkSampleTask | null
  live: boolean
}

export async function loadWorkspaceSession(interviewId: string): Promise<WorkspaceSession | null> {
  if (!interviewId) return null
  const iv = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true, status: true, completedAt: true,
      position: { select: { interviewMode: true, title: true, jdText: true, techStack: true, roleType: true, workSampleTask: true } },
    },
  })
  if (!iv) return null
  const mode = resolveMode(iv.position)
  const live = iv.status === 'in_progress' || iv.status === 'scheduled'
    || (iv.status === 'completed' && !!iv.completedAt && Date.now() - iv.completedAt.getTime() < GRACE_MS)
  return { interviewId: iv.id, mode, task: hasWorkspace(mode) ? sanitizeTask(iv.position.workSampleTask) : null, live }
}

export const MAX_CODE_CHARS = 64_000
export const MAX_EXECUTIONS = Math.max(10, Number(process.env.WORKSPACE_MAX_EXECUTIONS) || 60)
