import { getSessionFromRequest, type SessionPayload } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Control Room access (Screen-scoped, consumes existing RBAC) ────────────
// Screen RBAC is agency-scoped: every interview belongs to a Position owned by
// the session's agency. Roles: admin | recruiter | viewer. Screen has no
// per-interview recruiter assignment, so all signed-in members see their
// agency's interviews; only the agency boundary is enforced (as /api/reports
// and /api/dashboard/stats do).

export function requireControlRoomSession(req: Request): SessionPayload | null {
  return getSessionFromRequest(req)
}

// The interview, only if it belongs to the session's agency.
export async function findScopedInterview(interviewId: string, agencyId: string) {
  return prisma.interview.findFirst({
    where: { id: interviewId, position: { agencyId } },
    select: {
      id: true, status: true, isDemo: true, startedAt: true, completedAt: true, duration: true,
      actualDuration: true, terminationReason: true, transcript: true,
      candidate: { select: { id: true, name: true, email: true } },
      position: { select: { id: true, title: true, company: true } },
    },
  })
}
