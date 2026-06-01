import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[generate-report] Called with keys:', Object.keys(body))

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }

    const {
      interviewId,
      candidateId,
      candidateName,
      candidateEmail,
      positionTitle,
      company,
      interviewDate,
      duration,
      transcript = [],
      questionResponses = [],
      resumeText = '',
      techStack = [],
      experienceLevel = '',
      roleType = '',
    } = body

    if (!interviewId) {
      return NextResponse.json({ error: 'interviewId is required' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const transcriptText = transcript
      .map((t: { speaker: string; text: string }) => `[${t.speaker.toUpperCase()}]: ${t.text}`)
      .join('\n')

    const responsesText = questionResponses
      .map((r: { questionText: string; candidateResponse: string; score: number; keyPointsCovered: string[]; keyPointsMissed: string[] }, i: number) =>
        `Q${i + 1}: ${r.questionText}\nCandidate Response: ${r.candidateResponse}\nScore: ${r.score}/100\nKey Points Covered: ${r.keyPointsCovered.join(', ')}\nKey Points Missed: ${r.keyPointsMissed.join(', ')}`
      )
      .join('\n\n---\n\n')

    const resumeExcerpt = resumeText.slice(0, 1500)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'You are a senior recruitment consultant evaluating a candidate interview. ' +
        'Evaluate ONLY based on what the candidate explicitly said in the transcript. ' +
        'Do NOT infer, assume, or credit knowledge not demonstrated. ' +
        'If a key point was not addressed, mark it as Not Covered. ' +
        'Be specific — quote or closely reference actual candidate statements. ' +
        'Be balanced — note genuine strengths and genuine concerns. ' +
        'Never fabricate. Never hallucinate. Return strict JSON only, no markdown, no preamble.',
      messages: [
        {
          role: 'user',
          content:
            `Generate a complete interview evaluation report for ${candidateName} who interviewed for ${positionTitle} at ${company}.\n\n` +
            `Role context: ${experienceLevel} level ${roleType} role. Tech stack: ${techStack.join(', ')}.\n\n` +
            `Transcript:\n${transcriptText || 'No transcript available.'}\n\n` +
            `Question responses with scores:\n${responsesText || 'No question responses available.'}\n\n` +
            `Resume excerpt:\n${resumeExcerpt || 'No resume provided.'}\n\n` +
            `Return ONLY this exact JSON structure:\n` +
            `{\n` +
            `  "overallScore": <number 0-100>,\n` +
            `  "recommendation": "<strong_yes|yes|maybe|no>",\n` +
            `  "professionalSummary": "<4-5 sentence paragraph, third person, factual, grounded in transcript>",\n` +
            `  "sectionScores": {\n` +
            `    "technical":  { "score": <number>, "outOf": 100 },\n` +
            `    "scenario":   { "score": <number>, "outOf": 100 },\n` +
            `    "behavioral": { "score": <number>, "outOf": 100 },\n` +
            `    "eq":         { "score": <number>, "outOf": 100 },\n` +
            `    "whiteboard": { "score": <number>, "outOf": 100 }\n` +
            `  },\n` +
            `  "strengthAreas": ["<specific strength with evidence>", ...],\n` +
            `  "concernAreas": ["<specific concern with evidence>", ...],\n` +
            `  "questionWiseEvaluation": [\n` +
            `    {\n` +
            `      "questionId": "<string>",\n` +
            `      "questionText": "<string>",\n` +
            `      "questionType": "<string>",\n` +
            `      "isPreset": <boolean>,\n` +
            `      "candidateResponseExcerpt": "<max 150 chars>",\n` +
            `      "keyPointsCovered": ["<point>", ...],\n` +
            `      "keyPointsMissed": ["<point>", ...],\n` +
            `      "score": <number 0-10>,\n` +
            `      "evaluatorNote": "<1-2 sentences, factual>"\n` +
            `    }\n` +
            `  ],\n` +
            `  "transcriptHighlights": [\n` +
            `    { "quote": "<notable quote>", "context": "<where in interview>" }\n` +
            `  ],\n` +
            `  "hrNote": "<one paragraph plain English for HR>",\n` +
            `  "l2Recommendation": "<what to focus on in L2 if proceeding>"\n` +
            `}`,
        },
      ],
      temperature: 0.1,
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = raw.replace(/```json|```/g, '').trim()

    let report
    try {
      report = JSON.parse(clean)
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError)
      console.error('[generate-report] JSON parse failed:', msg)
      console.error('[generate-report] Raw output (first 500 chars):', raw.slice(0, 500))
      return NextResponse.json({ error: 'Report generation failed — invalid response format' }, { status: 500 })
    }

    // ── Persist to DB ─────────────────────────────────────────────────
    const resolvedCandidateId: string | null = candidateId ?? null

    if (resolvedCandidateId) {
      const reportData = {
        overallScore:           Math.round(report.overallScore ?? 0),
        recommendation:         report.recommendation ?? 'maybe',
        professionalSummary:    report.professionalSummary ?? '',
        sectionScores:          report.sectionScores ?? {},
        strengthAreas:          report.strengthAreas ?? [],
        concernAreas:           report.concernAreas ?? [],
        questionWiseEvaluation: report.questionWiseEvaluation ?? [],
        transcriptHighlights:   report.transcriptHighlights ?? [],
        hrNote:                 report.hrNote ?? '',
        l2Recommendation:       report.l2Recommendation ?? '',
      }
      try {
        await prisma.report.upsert({
          where:  { candidateId: resolvedCandidateId },
          update: reportData,
          create: { ...reportData, candidateId: resolvedCandidateId },
        })
        await prisma.candidate.update({
          where: { id: resolvedCandidateId },
          data:  {
            score:          Math.round(report.overallScore ?? 0),
            recommendation: report.recommendation ?? 'maybe',
            interviewedAt:  new Date(),
          },
        })
        console.log('[generate-report] Saved to DB for candidateId:', resolvedCandidateId)

        // Create notification for recruiter
        try {
          const candidateWithPos = await prisma.candidate.findUnique({
            where: { id: resolvedCandidateId },
            include: { position: { select: { agencyId: true } } },
          })
          const agencyId = candidateWithPos?.position?.agencyId
          if (agencyId) {
            await prisma.notification.create({
              data: {
                agencyId,
                type: 'report_ready',
                title: 'Report ready',
                body: `Evaluation report for ${candidateName} is ready — score: ${report.overallScore}`,
                link: `/report/${interviewId}`,
                metadata: { candidateId: resolvedCandidateId, score: report.overallScore },
              },
            })
          }
        } catch (notifErr) {
          console.warn('[generate-report] Notification creation failed (non-fatal):', notifErr)
        }
      } catch (dbError: unknown) {
        const msg = dbError instanceof Error ? dbError.message : String(dbError)
        console.error('[generate-report] DB save failed (non-fatal):', msg)
        // Non-fatal — still return the report to the client
      }
    } else {
      console.warn('[generate-report] No candidateId provided — skipping DB save')
    }

    return NextResponse.json({
      ...report,
      interviewId,
      candidateId: resolvedCandidateId,
      candidateName,
      candidateEmail,
      positionTitle,
      company,
      interviewDate,
      duration,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Report generation failed'
    const stack   = err instanceof Error ? err.stack   : undefined
    console.error('[generate-report] Error:', message)
    if (stack) console.error('[generate-report] Stack:', stack)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
