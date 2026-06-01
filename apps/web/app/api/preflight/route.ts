import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const candidateId = searchParams.get('candidateId')
    const positionId  = searchParams.get('positionId')

    if (!candidateId || !positionId) {
      return NextResponse.json({ error: 'candidateId and positionId required' }, { status: 400 })
    }

    const [position, candidate, questionSet] = await Promise.all([
      prisma.position.findUnique({ where: { id: positionId } }),
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.questionSet.findUnique({ where: { positionId } }),
    ])

    // Position approval check
    const positionApproved = !!(position?.techLeadApproved && position?.hrApproved)

    // Questions ready check — count all question arrays
    let questionCount = 0
    if (questionSet) {
      const count = (arr: unknown) => Array.isArray(arr) ? arr.length : 0
      questionCount =
        count(questionSet.technicalQuestions) +
        count(questionSet.scenarioQuestions) +
        count(questionSet.behavioralQuestions) +
        count(questionSet.eqQuestions) +
        count(questionSet.whiteboardQuestions)
    }
    const questionsReady = questionCount >= 5

    // Candidate invited check
    const candidateInvited = !!(candidate && ['invited', 'scheduled', 'interviewing'].includes(candidate.status))

    // ElevenLabs check
    const elevenLabsConfigured = !!(process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY)

    return NextResponse.json({
      positionApproved: {
        ok: positionApproved,
        reason: positionApproved ? undefined : !position?.techLeadApproved ? 'Tech lead approval pending' : 'HR approval pending',
      },
      questionsReady: {
        ok: questionsReady,
        count: questionCount,
        reason: questionsReady ? undefined : `Only ${questionCount} questions in question set — need at least 5`,
      },
      candidateInvited: {
        ok: candidateInvited,
        status: candidate?.status ?? 'not found',
        reason: candidateInvited ? undefined : 'Candidate has not been invited yet',
      },
      elevenLabsConfigured: {
        ok: elevenLabsConfigured,
        reason: elevenLabsConfigured ? undefined : 'ElevenLabs not configured — browser TTS will be used as fallback',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pre-flight check failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
