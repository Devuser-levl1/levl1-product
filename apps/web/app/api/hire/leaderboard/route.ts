import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── Recruiter leaderboard (Sprint 8 productivity, ranked) ──────────────────
// Ranks this tenant's team members by recruiting productivity over a date
// range. Reuses the candidate-activity stream (the same source as the analytics
// recruiter-productivity widget) and resolves userId → HireUser name. The
// composite "activity score" weights higher-leverage actions more.

const PLACEMENT_STAGES = ['Hired', 'Offer', 'Placed', 'Joined']
const WEIGHTS = { added: 1, advanced: 2, interview: 3, placement: 5 }

export const GET = withHireAuth(async (req, ctx) => {
  const sp = new URL(req.url).searchParams
  const parseDate = (v: string | null, fb: Date) => { if (!v) return fb; const d = new Date(v); return isNaN(d.getTime()) ? fb : d }
  const from = parseDate(sp.get('from'), new Date(Date.now() - 30 * 86400000))
  const to = parseDate(sp.get('to'), new Date())

  // Tenant team only.
  const users = await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true } })
  const userIds = users.map((u) => u.id)

  const activities = userIds.length
    ? await prisma.hireCandidateActivity.findMany({
        where: { candidate: { tenantId: ctx.tenantId }, createdAt: { gte: from, lte: to }, userId: { in: userIds } },
        select: { type: true, note: true, toStage: true, userId: true },
      })
    : []

  interface Row { userId: string; name: string; candidatesAdded: number; advanced: number; interviews: number; placements: number; score: number }
  const rows: Record<string, Row> = {}
  for (const u of users) rows[u.id] = { userId: u.id, name: u.name, candidatesAdded: 0, advanced: 0, interviews: 0, placements: 0, score: 0 }

  for (const a of activities) {
    const r = a.userId ? rows[a.userId] : undefined
    if (!r) continue
    if (a.type === 'stage_change') {
      r.advanced++
      if (a.toStage && PLACEMENT_STAGES.includes(a.toStage)) r.placements++
    } else if (a.type === 'interview_scheduled') {
      r.interviews++
    } else if (a.type === 'note' && a.note && /added via/i.test(a.note)) {
      // Creation activities: "Candidate added via <source>" / "Added via bulk import".
      r.candidatesAdded++
    }
  }

  const list = Object.values(rows)
    .map((r) => ({ ...r, score: r.candidatesAdded * WEIGHTS.added + r.advanced * WEIGHTS.advanced + r.interviews * WEIGHTS.interview + r.placements * WEIGHTS.placement }))
    .sort((a, b) => b.score - a.score || b.candidatesAdded - a.candidatesAdded || a.name.localeCompare(b.name))

  return NextResponse.json({ rows: list, teamSize: users.length, weights: WEIGHTS, range: { from: from.toISOString(), to: to.toISOString() } })
})
