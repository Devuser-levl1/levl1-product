import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPurposeToken } from '@/lib/hire/auth'
import { recordNurtureResponse, RESPONSE_BY_KEY, isFlagged, type NurtureResponse } from '@/lib/hire/nurture'

export const dynamic = 'force-dynamic'

// PUBLIC (token-authenticated) — the candidate taps a button in the check-in
// email. No login. Records the structured response and shows a thank-you page.
// GET /api/hire/nurture/respond?token=<signed>&option=all_good|issues|left|optout
function page(title: string, msg: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
    <body style="font-family:Inter,system-ui,sans-serif;background:#F8FAFC;margin:0;padding:0">
      <div style="max-width:440px;margin:64px auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:36px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px">${title}</div>
        <div style="font-size:14px;color:#475569;line-height:1.6">${msg}</div>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const token = sp.get('token') ?? ''
  const option = sp.get('option') ?? ''

  const claims = verifyPurposeToken(token)
  if (!claims || claims.purpose !== 'nurture' || !claims.checkinId || !claims.tenantId) {
    return page('Link expired', 'This check-in link is invalid or has expired. No action was taken.')
  }

  // Opt-out path.
  if (option === 'optout') {
    const ci = await prisma.hireNurtureCheckin.findFirst({ where: { id: claims.checkinId, tenantId: claims.tenantId }, select: { candidateId: true } })
    if (ci) {
      await prisma.hireCandidate.update({ where: { id: ci.candidateId }, data: { nurtureOptOut: true } })
      await prisma.hireNurtureCheckin.updateMany({ where: { candidateId: ci.candidateId, status: 'scheduled' }, data: { status: 'skipped' } })
    }
    return page('You’re opted out', 'You won’t receive any more check-ins. Thanks, and all the best!')
  }

  if (!RESPONSE_BY_KEY.has(option as NurtureResponse)) {
    return page('Hmm', 'That response wasn’t recognised. No action was taken.')
  }

  const ok = await recordNurtureResponse(claims.checkinId, claims.tenantId, option as NurtureResponse, 'email')
  if (!ok) return page('Link expired', 'This check-in is no longer available. No action was taken.')

  const flagged = isFlagged(option)
  return page(
    'Thanks for letting us know 🙏',
    flagged
      ? 'Thanks — we’ve noted this and your recruiter will reach out to help. Nothing more to do here.'
      : 'Great to hear! Thanks for the quick reply — nothing more to do.',
  )
}
