import { NextResponse } from 'next/server'
import { withPlatformAuth } from '@/lib/platform/auth'
import { prisma } from '@/lib/prisma'
import { LEAD_STAGES } from '@/lib/platform/leads'

export const dynamic = 'force-dynamic'

export const GET = withPlatformAuth(async (_req, _ctx, params) => {
  const lead = await prisma.platformLead.findUnique({ where: { id: params.id }, include: { activities: { orderBy: { createdAt: 'desc' } } } })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(lead)
})

// Fully editable at any stage; logs stage changes + a note to the timeline.
export const PATCH = withPlatformAuth(async (req, ctx, params) => {
  const existing = await prisma.platformLead.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  const data: Record<string, unknown> = {}
  for (const k of ['company', 'contactName', 'email', 'phone', 'source', 'notes', 'lostReason'] as const) {
    if (k in body) data[k] = body[k] || null
  }
  if ('type' in body) data.type = body.type === 'CORPORATE' ? 'CORPORATE' : body.type === 'AGENCY' ? 'AGENCY' : null
  if ('estValue' in body) data.estValue = body.estValue != null && body.estValue !== '' ? Number(body.estValue) : null
  if (body.contacted) data.lastContactedAt = new Date()

  let stageChanged: { from: string; to: string } | null = null
  if (typeof body.stage === 'string' && (LEAD_STAGES as readonly string[]).includes(body.stage) && body.stage !== existing.stage) {
    data.stage = body.stage
    stageChanged = { from: existing.stage, to: body.stage }
    if (body.stage === 'Won' && !existing.wonAt) data.wonAt = new Date()
  }

  const lead = await prisma.platformLead.update({ where: { id: existing.id }, data })
  if (stageChanged) {
    await prisma.platformLeadActivity.create({ data: { leadId: lead.id, type: 'stage_change', fromStage: stageChanged.from, toStage: stageChanged.to, note: `Moved ${stageChanged.from} → ${stageChanged.to}`, actorName: ctx.name } })
  } else if (typeof body.note === 'string' && body.note.trim()) {
    await prisma.platformLeadActivity.create({ data: { leadId: lead.id, type: 'note', note: body.note.trim(), actorName: ctx.name } })
  }
  return NextResponse.json(lead)
})

export const DELETE = withPlatformAuth(async (_req, _ctx, params) => {
  const existing = await prisma.platformLead.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.platformLead.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
})
