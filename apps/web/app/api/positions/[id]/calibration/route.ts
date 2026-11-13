import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { isRubricTier } from '@/lib/screen/rubrics/types'
import { addItem, approveItem, editRubric, editTask, readCalibration, regenerateItem, rejectItem, retierItem, startGeneration, verifyTask } from '@/lib/screen/calibration/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 300   // single-item regeneration / task drafting can take a while

// AI draft → moderator calibration for one position.
// GET  — the draft set, hydrated with content, reasoning, confidence and flags.
// POST { action, … } — generate | approve | reject | retier | edit_rubric |
//      edit_task | verify_task | regenerate | add. Calibration changes what
// interviews assess, so it needs edit rights (recruiter or admin, not viewer).
// Approval rules are enforced server-side (lib/screen/calibration/store.ts).

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const data = await readCalibration(params.id, access.session.agencyId)
  if (!data) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  return NextResponse.json({ ...data, canEdit: access.canEdit })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const { agencyId, email } = access.session
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const itemId = typeof b.itemId === 'string' ? b.itemId : ''
  const str = (v: unknown, n = 2000) => (typeof v === 'string' ? v.slice(0, n) : undefined)

  let r: { ok: true } | { ok: false; status: number; error: string } | ({ ok: true } & Record<string, unknown>)
  switch (b.action) {
    case 'generate': r = await startGeneration(params.id, agencyId, email); break
    case 'approve': r = await approveItem(params.id, agencyId, email, itemId, { note: str(b.note), viewed: b.viewed === true }); break
    case 'reject': r = await rejectItem(params.id, agencyId, email, itemId, str(b.note)); break
    case 'retier':
      if (!isRubricTier(b.tier)) return NextResponse.json({ error: 'Unknown tier' }, { status: 400 })
      r = await retierItem(params.id, agencyId, itemId, b.tier); break
    case 'edit_rubric': r = await editRubric(params.id, agencyId, email, itemId, b.rubric); break
    case 'edit_task': r = await editTask(params.id, agencyId, itemId, (b.task && typeof b.task === 'object' ? b.task : {}) as Record<string, unknown>); break
    case 'verify_task': r = await verifyTask(params.id, agencyId, itemId); break
    case 'regenerate': r = await regenerateItem(params.id, agencyId, email, itemId, str(b.instruction, 400)); break
    case 'add': {
      const type = b.type === 'rubric_ai' || b.type === 'task_ai' || b.type === 'rubric_existing' ? b.type : null
      if (!type) return NextResponse.json({ error: 'Unknown add type' }, { status: 400 })
      r = await addItem(params.id, agencyId, email, { type, competency: str(b.competency, 120), tier: isRubricTier(b.tier) ? b.tier : undefined, rubricId: str(b.rubricId, 40), instruction: str(b.instruction, 400) })
      break
    }
    default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  const data = await readCalibration(params.id, agencyId)
  return NextResponse.json({ ...r, ...data, canEdit: true })
}
