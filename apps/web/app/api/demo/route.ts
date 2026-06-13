import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const b = await req.json()
    const email = String(b.email ?? '').trim().toLowerCase()
    const name = String(b.name ?? '').trim()
    if (!name || !email.includes('@')) return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 })

    await prisma.demoRequest.create({
      data: { name, email, company: b.company || null, role: b.role || null, teamSize: b.teamSize || null, message: b.message || null },
    })

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to: 'hello@levl1.io',
        subject: `Demo request — ${name}${b.company ? ` (${b.company})` : ''}`,
        html: `<div style="font-family:Inter,system-ui,sans-serif">
          <h2>New demo request</h2>
          <p><b>Name:</b> ${name}<br/><b>Email:</b> ${email}<br/><b>Company:</b> ${b.company || '—'}<br/>
          <b>Role:</b> ${b.role || '—'}<br/><b>Team size:</b> ${b.teamSize || '—'}</p>
          <p><b>Message:</b><br/>${(b.message || '—').toString().replace(/</g, '&lt;')}</p>
        </div>`,
      }).catch((e) => console.error('[demo] email failed:', e))
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[demo] error:', err)
    return NextResponse.json({ error: 'Could not submit — try again' }, { status: 500 })
  }
}
