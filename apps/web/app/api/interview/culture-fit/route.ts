import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { resolveCultureFitItems, scoreCultureFit, LIKERT_OPTIONS, type LikertResponse } from '@/lib/screen/session/culture-fit'

export const dynamic = 'force-dynamic'

// GET ?interviewId= → the resolved Likert item set for this interview's position
// (per-position custom items, else the generic default). Drives the on-screen /
// voice-presented segment. Validated by interviewId (like the other live routes).
export async function GET(req: NextRequest) {
  const interviewId = new URL(req.url).searchParams.get('interviewId')?.trim()
  if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { id: true, position: { select: { cultureFitItems: true } } },
  })
  if (!interview) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const items = resolveCultureFitItems(interview.position?.cultureFitItems)
  return NextResponse.json({ items, options: LIKERT_OPTIONS })
}

// POST { interviewId, responses:[{id,prompt,dimension?,reverse?,value,label}] }
// → score on the SEPARATE culture-fit axis and persist one CultureFitResult.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId : ''
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })
    const interview = await prisma.interview.findUnique({ where: { id: interviewId }, select: { id: true } })
    if (!interview) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const responses: LikertResponse[] = Array.isArray(body.responses) ? body.responses : []
    const { fitScore, summary } = scoreCultureFit(responses)

    await prisma.cultureFitResult.upsert({
      where: { interviewId },
      update: { responses: responses as unknown as Prisma.InputJsonValue, fitScore, summary },
      create: { interviewId, responses: responses as unknown as Prisma.InputJsonValue, fitScore, summary },
    })
    return NextResponse.json({ fitScore, summary, itemCount: responses.length })
  } catch (err) {
    console.error('[interview/culture-fit]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'save failed' }, { status: 500 })
  }
}
