import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { issueType, subject, description, userEmail } = await req.json()
    if (!issueType || !subject || !description || !userEmail) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: { issueType, subject, description, userEmail },
    })

    // Optional: send notification email via Resend (fires-and-forgets)
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Levl1 Support <support@levl1.app>',
          to: ['support@levl1.app'],
          subject: `[Ticket #${ticket.ticketNumber}] ${issueType}: ${subject}`,
          html: `<p><strong>From:</strong> ${userEmail}</p>
                 <p><strong>Type:</strong> ${issueType}</p>
                 <p><strong>Subject:</strong> ${subject}</p>
                 <p><strong>Description:</strong></p>
                 <p>${description.replace(/\n/g, '<br/>')}</p>`,
        }),
      }).catch(() => {}) // best-effort
    }

    return NextResponse.json({ ticketNumber: ticket.ticketNumber }, { status: 201 })
  } catch (err) {
    console.error('support POST error:', err)
    return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 500 })
  }
}
