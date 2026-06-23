import { NextResponse } from 'next/server'
import { withPlatformAuth } from '@/lib/platform/auth'
import { prisma } from '@/lib/prisma'
import { LEAD_STAGES } from '@/lib/platform/leads'

export const dynamic = 'force-dynamic'

// List leads grouped by stage (+ flat list) for the platform CRM board.
export const GET = withPlatformAuth(async () => {
  const leads = await prisma.platformLead.findMany({ orderBy: [{ updatedAt: 'desc' }] })
  const grouped = LEAD_STAGES.map((stage) => {
    const list = leads.filter((l) => l.stage === stage)
    return { stage, leads: list, totalValue: list.reduce((s, l) => s + (l.estValue || 0), 0) }
  })
  const openValue = leads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost').reduce((s, l) => s + (l.estValue || 0), 0)
  const wonValue = leads.filter((l) => l.stage === 'Won').reduce((s, l) => s + (l.estValue || 0), 0)
  return NextResponse.json({ leads, grouped, openValue, wonValue })
})

export const POST = withPlatformAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const company = String(body.company ?? '').trim()
  if (!company) return NextResponse.json({ error: 'Company is required' }, { status: 400 })

  const lead = await prisma.platformLead.create({
    data: {
      company,
      contactName: body.contactName || null,
      email: body.email ? String(body.email).toLowerCase() : null,
      phone: body.phone || null,
      source: body.source || null,
      type: body.type === 'CORPORATE' ? 'CORPORATE' : body.type === 'AGENCY' ? 'AGENCY' : null,
      stage: (LEAD_STAGES as readonly string[]).includes(body.stage) ? body.stage : 'New',
      estValue: body.estValue != null ? Number(body.estValue) : null,
      notes: body.notes || null,
      ownerUserId: ctx.userId,
      ownerName: ctx.name,
    },
  })
  await prisma.platformLeadActivity.create({ data: { leadId: lead.id, type: 'created', note: `Lead created by ${ctx.name}`, actorName: ctx.name } })
  return NextResponse.json(lead, { status: 201 })
})
