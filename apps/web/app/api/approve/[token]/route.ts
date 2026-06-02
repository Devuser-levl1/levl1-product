import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

// GET — validate token and return position + questions
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const approval = await prisma.approvalToken.findUnique({
      where:   { token: params.token },
      include: {
        position: {
          include: { questionSet: true },
        },
      },
    })

    if (!approval) return NextResponse.json({ error: 'Invalid approval link' }, { status: 404 })
    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'This approval has already been submitted', alreadyDone: true, status: approval.status }, { status: 200 })
    }
    if (new Date() > approval.expiresAt) {
      return NextResponse.json({ error: 'This approval link has expired. Ask the recruiter to resend.' }, { status: 410 })
    }

    const pos = approval.position
    const qs  = pos.questionSet

    // Return only questions relevant to this approver type
    const isTechLead = approval.type === 'tech_lead'
    const isHR       = approval.type === 'hr'

    return NextResponse.json({
      id:            approval.id,
      type:          approval.type,
      positionTitle: pos.title,
      company:       pos.company,
      department:    pos.department,
      experienceLevel: pos.experienceLevel,
      techStack:     pos.techStack,
      questions: {
        technical:   isTechLead ? (qs?.technicalQuestions  ?? []) : [],
        scenario:    isTechLead ? (qs?.scenarioQuestions   ?? []) : [],
        whiteboard:  isTechLead ? (qs?.whiteboardQuestions ?? []) : [],
        behavioral:  isHR       ? (qs?.behavioralQuestions ?? []) : [],
        eq:          isHR       ? (qs?.eqQuestions         ?? []) : [],
      },
      questionSetId: qs?.id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load approval'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — submit approval decision
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { decision, comments, updatedQuestions } = await req.json()
    // decision: 'approved' | 'changes_requested'

    const approval = await prisma.approvalToken.findUnique({
      where:   { token: params.token },
      include: {
        position: {
          include: { questionSet: true, agency: true },
        },
      },
    })
    if (!approval) return NextResponse.json({ error: 'Invalid approval link' }, { status: 404 })
    if (approval.status !== 'pending') return NextResponse.json({ error: 'Already submitted' }, { status: 400 })
    if (new Date() > approval.expiresAt) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

    // Update approval token
    await prisma.approvalToken.update({
      where: { id: approval.id },
      data:  { status: decision, comments: comments ?? null, approvedAt: new Date() },
    })

    // If approved, update Position approved fields
    if (decision === 'approved') {
      const updateData: Record<string, boolean> = {}
      if (approval.type === 'tech_lead') updateData.techLeadApproved = true
      if (approval.type === 'hr')        updateData.hrApproved        = true
      await prisma.position.update({ where: { id: approval.positionId }, data: updateData })
    }

    // Save any question edits back to the question set
    if (updatedQuestions && approval.position.questionSet) {
      const qsUpdate: Record<string, unknown> = {}
      if (updatedQuestions.technical)  qsUpdate.technicalQuestions  = updatedQuestions.technical
      if (updatedQuestions.scenario)   qsUpdate.scenarioQuestions   = updatedQuestions.scenario
      if (updatedQuestions.whiteboard) qsUpdate.whiteboardQuestions = updatedQuestions.whiteboard
      if (updatedQuestions.behavioral) qsUpdate.behavioralQuestions = updatedQuestions.behavioral
      if (updatedQuestions.eq)         qsUpdate.eqQuestions         = updatedQuestions.eq
      if (Object.keys(qsUpdate).length > 0) {
        await prisma.questionSet.update({ where: { positionId: approval.positionId }, data: qsUpdate })
      }
    }

    // Check if BOTH tech lead AND HR have approved → activate position
    const [techApproval, hrApproval] = await Promise.all([
      prisma.approvalToken.findFirst({ where: { positionId: approval.positionId, type: 'tech_lead', status: 'approved' } }),
      prisma.approvalToken.findFirst({ where: { positionId: approval.positionId, type: 'hr', status: 'approved' } }),
    ])

    const position   = approval.position
    const techNeeded = !!position.techLeadEmail
    const hrNeeded   = !!position.hrEmail
    const bothDone   = (!techNeeded || !!techApproval) && (!hrNeeded || !!hrApproval)

    let positionActivated = false
    if (bothDone && decision === 'approved') {
      await prisma.position.update({
        where: { id: approval.positionId },
        data:  { status: 'active' },
      })
      positionActivated = true

      // Notify recruiter
      if (position.agency) {
        await prisma.notification.create({
          data: {
            agencyId: position.agency.id,
            type:     'position_activated',
            title:    'Position activated',
            body:     `${position.title} is now live — both tech lead and HR have approved.`,
            link:     `/positions/${position.id}`,
          },
        }).catch(() => {})

        // Email recruiter
        if (process.env.RESEND_API_KEY) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
          await sendEmail({
            to:      position.agency.senderEmail ?? '',
            subject: `✅ ${position.title} is now live on Levl1`,
            html: `<p>Both approvers have approved the interview questions for <strong>${position.title}</strong>. The position is now active and ready for candidates.</p><a href="${appUrl}/positions/${position.id}">View Position</a>`,
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({
      success: true,
      decision,
      positionActivated,
      waitingFor: bothDone ? [] : [
        ...(!techApproval && techNeeded ? ['tech_lead'] : []),
        ...(!hrApproval   && hrNeeded   ? ['hr']        : []),
      ],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit approval'
    console.error('[approve/[token]] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
