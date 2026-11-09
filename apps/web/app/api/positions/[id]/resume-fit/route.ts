import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { scoreRoleFit, type FitCandidate } from '@/lib/screen/resume/role-fit'

export const dynamic = 'force-dynamic'

// POST /api/positions/:id/resume-fit — Fixpack 8 #4.
// Body: { candidates: [{ currentTitle?, topSkills?, totalYears?, resumeText? }] } (max 50)
// Scores each parsed resume against THIS position's required skills, must-haves,
// role family and experience range. Deterministic + explainable; no AI call.

const MAX = 50
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null)

function toCandidate(raw: unknown): FitCandidate {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    currentTitle: str(r.currentTitle, 200),
    topSkills: Array.isArray(r.topSkills) ? r.topSkills.filter((s): s is string => typeof s === 'string').slice(0, 60).map((s) => s.slice(0, 80)) : [],
    totalYears: typeof r.totalYears === 'number' && Number.isFinite(r.totalYears) ? r.totalYears : null,
    resumeText: str(r.resumeText, 20000),
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const position = await prisma.position.findFirst({
    where: { id: params.id, agencyId: access.session.agencyId },
    select: { title: true, techStack: true, goodToHave: true, mustHaves: true, experienceMin: true, experienceMax: true },
  })
  if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

  const body = await req.json().catch(() => null) as { candidates?: unknown } | null
  if (!body || !Array.isArray(body.candidates)) return NextResponse.json({ error: 'candidates[] is required' }, { status: 400 })
  if (body.candidates.length > MAX) return NextResponse.json({ error: `At most ${MAX} candidates per request` }, { status: 400 })

  const pos = {
    title: position.title,
    techStack: position.techStack,
    goodToHave: position.goodToHave,
    mustHaves: position.mustHaves,
    experienceMin: position.experienceMin,
    experienceMax: position.experienceMax,
  }
  return NextResponse.json({ results: body.candidates.map((c) => scoreRoleFit(pos, toCandidate(c))) })
}
