import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { dispatchInterviewsWebhook, agencyIdForInterview } from '@/lib/interviews/webhooks'
import { isNonEvaluableResponse, interviewHasAnyEvidence, INSUFFICIENT_EVIDENCE } from '@/lib/screen/session/scoring'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[generate-report] Called')
    console.log('[generate-report] candidateId:', body.candidateId)
    console.log('[generate-report] transcript length:', body.transcript?.length)
    console.log('[generate-report] responses length:', body.questionResponses?.length)
    console.log('[generate-report] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)

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

    const hasTranscript = Array.isArray(transcript) && transcript.length > 0
    const hasResponses = Array.isArray(questionResponses) && questionResponses.length > 0

    // ── Fallback: candidate completed but nothing was captured ────────
    if (!hasTranscript && !hasResponses) {
      console.warn('[generate-report] No transcript or responses — generating minimal report')

      const minimalReport = {
        overallScore: 0,
        recommendation: 'maybe' as const,
        professionalSummary:
          `The interview for ${candidateName || 'this candidate'} was marked complete, but no transcript or ` +
          `question responses were captured. This may indicate an audio/microphone issue or an early exit. ` +
          `No evaluation could be performed — a manual re-interview or review is recommended.`,
        sectionScores: {
          technical:  { score: 0, outOf: 100 },
          scenario:   { score: 0, outOf: 100 },
          behavioral: { score: 0, outOf: 100 },
          eq:         { score: 0, outOf: 100 },
          whiteboard: { score: 0, outOf: 100 },
        },
        strengthAreas: [],
        concernAreas: ['No transcript or question responses were captured during the interview.'],
        questionWiseEvaluation: [],
        transcriptHighlights: [],
        hrNote: 'Transcript was not captured for this interview. Recommend re-interviewing the candidate.',
        l2Recommendation: '',
      }

      const resolvedCandidateId: string | null = candidateId ?? null
      let savedReportId: string | null = null
      if (resolvedCandidateId) {
        try {
          const saved = await prisma.report.upsert({
            where:  { candidateId: resolvedCandidateId },
            update: minimalReport,
            create: { ...minimalReport, candidateId: resolvedCandidateId },
          })
          savedReportId = saved.id
          await prisma.candidate.update({
            where: { id: resolvedCandidateId },
            data:  { score: 0, recommendation: 'maybe', interviewedAt: new Date() },
          })
          console.log('[generate-report] Saved report ID:', savedReportId)
        } catch (dbError: unknown) {
          const msg = dbError instanceof Error ? dbError.message : String(dbError)
          console.error('[generate-report] Minimal report DB save failed (non-fatal):', msg)
        }
      }

      return NextResponse.json({
        ...minimalReport,
        l2Recommended: false,
        minimal: true,
        reportId: savedReportId,
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
      model: SCORING_MODEL,  // brain split: final scoring on the deeper model
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
            `  "communication": {\n` +
            `    "coherence": <0-10>, "fluency": <0-10>, "grammar": <0-10>, "clarity": <0-10>,\n` +
            `    "cefr": "<A1|A2|B1|B2|C1|C2>",\n` +
            `    "rationale": "<1 sentence on spoken communication quality, grounded in the transcript>"\n` +
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
      // NOTE: SCORING_MODEL is Opus 4.8, which rejects temperature/top_p/top_k (400).
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    console.log('[generate-report] Claude raw response:', raw.slice(0, 300))
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

    // ── Insufficient-evidence honesty (Build 01-B3) ───────────────────
    // Never emit a confident score for content that wasn't actually evaluable.
    {
      const evResponses = (Array.isArray(questionResponses) ? questionResponses : [])
        .map((r: { candidateResponse?: string }) => ({ response: r.candidateResponse }))
      // Per-question evidence tag (evidence-linked, audit-able).
      if (Array.isArray(report.questionWiseEvaluation)) {
        report.questionWiseEvaluation = report.questionWiseEvaluation.map((q: { candidateResponse?: string }) => ({
          ...q, status: isNonEvaluableResponse(q.candidateResponse) ? INSUFFICIENT_EVIDENCE : 'SCORED',
        }))
      }
      // Whole-interview gate: an unengaged interview is NOT a polished pass/fail.
      if (!interviewHasAnyEvidence(evResponses)) {
        const ss = (report.sectionScores ?? {}) as Record<string, { outOf?: number }>
        for (const k of Object.keys(ss)) ss[k] = { score: null, outOf: ss[k]?.outOf ?? 100, status: INSUFFICIENT_EVIDENCE } as never
        report.sectionScores = ss
        report.communication = { status: INSUFFICIENT_EVIDENCE }
        report.insufficientEvidence = true
        report.recommendation = 'no'
        // bugfix: distinguish a likely mic/STT failure from a genuinely unengaged
        // candidate, so an empty report isn't misread as a real (failed) assessment.
        const sttNote = body.sttFailed
          ? 'No candidate audio was captured for the entire session, which strongly suggests a microphone or speech-to-text failure rather than a candidate who did not engage — this interview should be re-run after confirming the mic works. '
          : ''
        report.professionalSummary = `Insufficient evidence to score: ${sttNote}the candidate did not provide evaluable content during this interview, so no competency assessment can be made. This should not be read as a pass or fail. ${report.professionalSummary ?? ''}`.trim()
      }
    }

    // ── Apply rubric weights if position has a scoring rubric ─────────
    let weightedScore = report.insufficientEvidence ? 0 : Math.round(report.overallScore ?? 0)
    let l2Recommended = false

    try {
      // Fetch position rubric — find via candidateId or interviewId
      let positionData: { scoringRubric: unknown; l2ScoreThreshold: number } | null = null
      if (candidateId) {
        const cand = await prisma.candidate.findUnique({
          where: { id: candidateId },
          include: { position: { select: { scoringRubric: true, l2ScoreThreshold: true } } },
        })
        positionData = cand?.position ?? null
      }
      if (!positionData && body.positionId) {
        positionData = await prisma.position.findUnique({
          where: { id: body.positionId },
          select: { scoringRubric: true, l2ScoreThreshold: true },
        })
      }

      if (positionData?.scoringRubric && !report.insufficientEvidence) {
        const rubric = positionData.scoringRubric as { technical?: number; problemSolving?: number; behavioral?: number; eq?: number }
        const ss = report.sectionScores ?? {}
        const t  = (ss.technical?.score  ?? weightedScore) * ((rubric.technical     ?? 40) / 100)
        const p  = (ss.scenario?.score   ?? weightedScore) * ((rubric.problemSolving ?? 30) / 100)
        const b  = (ss.behavioral?.score ?? weightedScore) * ((rubric.behavioral     ?? 20) / 100)
        const e  = (ss.eq?.score         ?? weightedScore) * ((rubric.eq             ?? 10) / 100)
        weightedScore = Math.round(t + p + b + e)
      }

      const threshold = positionData?.l2ScoreThreshold ?? 75
      l2Recommended = weightedScore >= threshold && ['yes', 'strong_yes'].includes(report.recommendation ?? '')
    } catch (rubricErr) {
      console.warn('[generate-report] Rubric weighting failed (non-fatal):', rubricErr)
    }

    // ── Persist to DB ─────────────────────────────────────────────────
    const resolvedCandidateId: string | null = candidateId ?? null

    if (resolvedCandidateId) {
      const reportData = {
        overallScore:           weightedScore,
        recommendation:         report.recommendation ?? 'maybe',
        professionalSummary:    report.professionalSummary ?? '',
        sectionScores:          report.sectionScores ?? {},
        strengthAreas:          report.strengthAreas ?? [],
        concernAreas:           report.concernAreas ?? [],
        questionWiseEvaluation: report.questionWiseEvaluation ?? [],
        transcriptHighlights:   report.transcriptHighlights ?? [],
        hrNote:                 report.hrNote ?? '',
        l2Recommendation:       report.l2Recommendation ?? '',
        communication:          (report.communication ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        insufficientEvidence:   report.insufficientEvidence === true,
      }
      try {
        const savedReport = await prisma.report.upsert({
          where:  { candidateId: resolvedCandidateId },
          update: reportData,
          create: { ...reportData, candidateId: resolvedCandidateId },
        })
        console.log('[generate-report] Saved report ID:', savedReport.id)
        await prisma.candidate.update({
          where: { id: resolvedCandidateId },
          data:  {
            score:          weightedScore,
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

        // Send report-ready email to the recruiter (first user of the agency)
        try {
          const cand = await prisma.candidate.findUnique({
            where: { id: resolvedCandidateId },
            include: { position: { select: { agencyId: true, title: true, company: true } } },
          })
          const agencyId = cand?.position?.agencyId
          const recruiter = agencyId
            ? await prisma.user.findFirst({ where: { agencyId }, orderBy: { createdAt: 'asc' } })
            : null

          if (recruiter && process.env.RESEND_API_KEY) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
            await sendEmail({
              to: recruiter.email,
              subject: `Report Ready — ${candidateName} for ${cand?.position?.title ?? positionTitle}`,
              html: `
                <p>Hi ${recruiter.name},</p>
                <p>The evaluation report for <strong>${candidateName}</strong> is ready.</p>
                <p><strong>Position:</strong> ${cand?.position?.title ?? positionTitle} at ${cand?.position?.company ?? company}<br/>
                <strong>Score:</strong> ${weightedScore}/100<br/>
                <strong>Recommendation:</strong> ${report.recommendation ?? 'maybe'}</p>
                <a href="${appUrl}/report/${interviewId}"
                   style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
                  View Full Report →
                </a>
                <p style="color:#94A3B8;font-size:12px;margin-top:24px;">Levl1 AI Interview Platform</p>
              `,
            })
            console.log('[generate-report] Report-ready email sent to:', recruiter.email)
          }
        } catch (emailError: unknown) {
          const msg = emailError instanceof Error ? emailError.message : String(emailError)
          console.error('[generate-report] Report-ready email failed:', msg)
          // Don't fail the whole report if email fails
        }

        // ── Fire outbound webhooks (interview.completed + report.ready) ──
        // Interviews-owned only — keyed off the Agency that owns the interview's
        // Position. (Hire no longer runs in-built interviews; the Hire-side sync
        // and webhook coupling were removed in Phase 2.)
        try {
          const reportAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
          const base = {
            interviewId,
            candidateId: resolvedCandidateId,
            candidateName,
            candidateEmail,
            positionTitle,
            company,
            overallScore: weightedScore,
            recommendation: report.recommendation ?? 'maybe',
            reportUrl: `${reportAppUrl}/report/${interviewId}`,
            completedAt: new Date().toISOString(),
          }
          const reportPayload = { ...base, sectionScores: report.sectionScores ?? {}, summary: report.professionalSummary ?? '' }
          const agencyId = await agencyIdForInterview(interviewId)
          if (agencyId) {
            await dispatchInterviewsWebhook(agencyId, 'interview.completed', base)
            await dispatchInterviewsWebhook(agencyId, 'report.ready', reportPayload)
          }
        } catch (whErr) {
          console.error('[generate-report] webhook dispatch failed (non-fatal):', whErr)
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
      overallScore: weightedScore,
      l2Recommended,
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
