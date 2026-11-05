import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { inferRole, matchSkills } from '@/lib/screen/taskbank/select'
import { sanitizeSkillMap, type SkillNode } from '@/lib/screen/taskbank/types'

export const dynamic = 'force-dynamic'

// GET — JD skills / must-haves on this agency's positions that NO skill-map
// entry recognises yet, grouped by inferred role and ranked by how many
// positions use them. Feeds the "Unrecognised JD skills" card so aliases
// grow from the words the agency's JDs actually use. Agency-scoped.
export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  const [positions, maps] = await Promise.all([
    prisma.position.findMany({ where: { agencyId, isDemo: false }, select: { id: true, title: true, techStack: true, mustHaves: true } }),
    prisma.roleSkillMap.findMany({ where: { agencyId }, orderBy: { updatedAt: 'desc' }, select: { id: true, role: true, skills: true } }),
  ])
  const mapByRole = new Map<string, { id: string; skills: SkillNode[] }>()
  for (const m of maps) if (!mapByRole.has(m.role)) mapByRole.set(m.role, { id: m.id, skills: sanitizeSkillMap(m.skills) })

  const buckets = new Map<string, { role: string | null; term: string; positions: Set<string>; examples: string[] }>()
  const noRole: { title: string; id: string }[] = []
  for (const p of positions) {
    const role = inferRole(p.title, p.techStack)
    if (!role) { noRole.push({ id: p.id, title: p.title }); continue }
    const map = mapByRole.get(role)
    const terms = Array.from(new Set([...p.techStack, ...p.mustHaves].map((t) => t.trim()).filter((t) => t.length >= 2 && t.length <= 60)))
    for (const term of terms) {
      if (map && matchSkills([term], map.skills).size) continue
      const k = `${role}::${term.toLowerCase()}`
      const b = buckets.get(k) ?? { role, term, positions: new Set<string>(), examples: [] }
      b.positions.add(p.id)
      if (b.examples.length < 3 && !b.examples.includes(p.title)) b.examples.push(p.title)
      buckets.set(k, b)
    }
  }
  const roles = Array.from(new Set(Array.from(buckets.values()).map((b) => b.role as string)))
  return NextResponse.json({
    roles: roles.map((role) => ({
      role,
      mapId: mapByRole.get(role)?.id ?? null,
      skills: (mapByRole.get(role)?.skills ?? []).map((s) => ({ id: s.id, name: s.name })),
      terms: Array.from(buckets.values()).filter((b) => b.role === role)
        .map((b) => ({ term: b.term, positions: b.positions.size, examples: b.examples }))
        .sort((a, b) => b.positions - a.positions || a.term.localeCompare(b.term))
        .slice(0, 60),
    })),
    positionsWithoutRole: noRole.slice(0, 20),
  })
}
