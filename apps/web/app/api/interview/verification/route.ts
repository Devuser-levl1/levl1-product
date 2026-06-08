import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Record identity / integrity signals for an interview and recompute the
 * integrity score. Accepts partial updates — callers send whatever changed
 * (name confirmation, captured photo, tab-switch count, etc).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { interviewId } = body
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const existing = await prisma.interviewVerification.findUnique({ where: { interviewId } })

    const nameConfirmed = typeof body.nameConfirmed === 'string' ? body.nameConfirmed : existing?.nameConfirmed ?? null
    const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : existing?.photoUrl ?? null
    const tabSwitchCount = Number.isInteger(body.tabSwitchCount) ? body.tabSwitchCount : existing?.tabSwitchCount ?? 0
    const faceMissingMs = Number.isInteger(body.faceMissingMs) ? body.faceMissingMs : existing?.faceMissingMs ?? 0
    const multipleFaces = typeof body.multipleFaces === 'boolean' ? body.multipleFaces : existing?.multipleFaces ?? false

    // ── Integrity scoring ──────────────────────────────────────────
    const flags: { type: string; detail: string; at: string }[] = Array.isArray(existing?.integrityFlags)
      ? (existing!.integrityFlags as { type: string; detail: string; at: string }[])
      : []
    if (Array.isArray(body.newFlags)) {
      for (const f of body.newFlags) {
        if (f && f.type) flags.push({ type: String(f.type), detail: String(f.detail ?? ''), at: new Date().toISOString() })
      }
    }

    let score = 100
    score -= Math.min(tabSwitchCount * 5, 30)        // up to -30 for tab switches
    score -= Math.min(Math.floor(faceMissingMs / 5000) * 5, 30) // -5 per 5s missing, cap -30
    if (multipleFaces) score -= 15
    const integrityScore = Math.max(0, Math.min(100, score))

    const data = {
      nameConfirmed,
      nameConfirmedAt: body.nameConfirmed ? new Date() : existing?.nameConfirmedAt ?? null,
      photoUrl,
      photoCapturedAt: body.photoUrl ? new Date() : existing?.photoCapturedAt ?? null,
      tabSwitchCount,
      faceMissingMs,
      multipleFaces,
      integrityScore,
      integrityFlags: flags,
    }

    const saved = await prisma.interviewVerification.upsert({
      where: { interviewId },
      update: data,
      create: { interviewId, ...data },
    })

    return NextResponse.json({ ok: true, integrityScore: saved.integrityScore })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record verification'
    console.error('[verification] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
