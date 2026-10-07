import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

const HIRING_FOR: Record<string, string> = {
  my_company: 'My company',
  agency_clients: 'My agency’s clients',
}

// Optional string field, trimmed and capped; empty → null.
function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function POST(req: Request) {
  try {
    const b = await req.json()
    const email = (str(b.email, 200) ?? '').toLowerCase()
    const name = str(b.name, 120) ?? ''
    if (!name || !email.includes('@')) return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 })

    const company = str(b.company, 200)
    const role = str(b.role, 120)
    const teamSize = str(b.teamSize, 40)
    const hiringFor = typeof b.hiringFor === 'string' ? HIRING_FOR[b.hiringFor] ?? null : null
    const note = str(b.message, 4000)
    // DemoRequest has no hiringFor column — keep it with the message (no schema change).
    const message = [hiringFor && `Hiring for: ${hiringFor}`, note].filter(Boolean).join('\n\n') || null

    await prisma.demoRequest.create({ data: { name, email, company, role, teamSize, message } })

    if (process.env.RESEND_API_KEY) {
      // TODO(abhijit): set DEMO_LEADS_TO_EMAIL on Render to route demo leads; falls back to hello@levl1.io.
      const to = process.env.DEMO_LEADS_TO_EMAIL || 'hello@levl1.io'
      await sendEmail({
        to,
        subject: `Demo request — ${name}${company ? ` (${company})` : ''}`,
        html: `<div style="font-family:Inter,system-ui,sans-serif">
          <h2>New demo request</h2>
          <p><b>Name:</b> ${esc(name)}<br/><b>Email:</b> ${esc(email)}<br/><b>Company:</b> ${esc(company || '—')}<br/>
          <b>Role:</b> ${esc(role || '—')}<br/><b>Hiring for:</b> ${esc(hiringFor || '—')}${teamSize ? `<br/><b>Team size:</b> ${esc(teamSize)}` : ''}</p>
          <p><b>Message:</b><br/>${esc(note || '—').replace(/\n/g, '<br/>')}</p>
        </div>`,
      }).catch((e) => console.error('[demo] email failed:', e))
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[demo] error:', err)
    return NextResponse.json({ error: 'Could not submit — try again' }, { status: 500 })
  }
}
