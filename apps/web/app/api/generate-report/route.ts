import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { dispatchInterviewsWebhook, agencyIdForInterview } from '@/lib/interviews/webhooks'
import { isNonEvaluableResponse, interviewHasAnyEvidence, INSUFFICIENT_EVIDENCE } from '@/lib/screen/session/scoring'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { scoreWorkSample } from '@/lib/screen/workspace/scoring'
import { Prisma } from '@prisma/client'
import { reconcileMustHaves } from '@/lib/screen/recruiter/must-haves'
import { reconcileConcepts, sanitizeConceptRubric } from '@/lib/screen/position-config'
import { appUrl } from '@/lib/screen/app-url'
import { markReport, serverReportInput } from '@/lib/screen/report/pipeline'
import { readSelection, TIER_INFO } from '@/lib/screen/rubrics/types'
import { applyTierVerdict, reconcileRubricResults, type RubricAssessment } from '@/lib/screen/rubrics/scoring'

// Fixpack 6 #3: when the caller sends no transcript/responses (recruiter
// "Generate Report", the server sweep), use what the server already persisted
// (heartbeat transcript + responses) instead of producing an empty report.
// `any` preserved deliberately: the route has always consumed req.json() untyped;
// typing the whole legacy body is out of scope for this fix.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withServerFallback(raw: any): Promise<any> {
  const empty = (v: unknown) => !Array.isArray(v) || v.length === 0
  // A non-array (e.g. a stored, still-encrypted value) is never passed through.
  if (!Array.isArray(raw.transcript)) raw.transcript = []
  if (!Array.isArray(raw.questionResponses)) raw.questionResponses = []
  if (typeof raw.interviewId !== 'string' || !empty(raw.transcript) || !empty(raw.questionResponses)) return raw
  const srv = await serverReportInput(raw.interviewId).catch(() => null)
  if (!srv || (srv.transcript.length === 0 && srv.questionResponses.length === 0)) return raw
  console.log('[generate-report] Using server-persisted transcript:', srv.transcript.length, 'lines,', srv.questionResponses.length, 'responses')
  return { ...raw, ...srv, candidateId: (raw.candidateId as string | undefined) ?? srv.candidateId }
}

// Every failure path marks the interview "report failed" (visible to the
// recruiter) before returning — never a silent nothing.
function fail(interviewId: unknown, message: string, status = 500) {
  if (typeof interviewId === 'string' && interviewId) void markReport(interviewId, 'failed', message)
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  let interviewIdForStatus: unknown = null
  try {
    const body = await withServerFallback(await req.json())
    interviewIdForStatus = body.interviewId
    console.log('[generate-report] Called')
    console.log('[generate-report] candidateId:', body.candidateId)
    console.log('[generate-report] transcript length:', body.transcript?.length)
    console.log('[generate-report] responses length:', body.questionResponses?.length)
    console.log('[generate-report] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return fail(body.interviewId, 'No API key configured')
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
    await markReport(interviewId, 'generating', null, true)

    // Recruiter-marked must-have requirements for this position (Screen F3).
    // Recruiter-marked must-haves (F3) + the JD-derived concept rubric (#13).
    const posCfg = candidateId
      ? (await prisma.candidate.findUnique({ where: { id: candidateId }, select: { position: { select: { mustHaves: true, conceptRubric: true, rubricSelection: true } } } }).catch(() => null))?.position ?? null
      : body.positionId
        ? await prisma.position.findUnique({ where: { id: body.positionId }, select: { mustHaves: true, conceptRubric: true, rubricSelection: true } }).catch(() => null)
        : null
    const mustHaves: string[] = posCfg?.mustHaves ?? []
    const conceptRubric = sanitizeConceptRubric(posCfg?.conceptRubric)
    // Rubric library selection, tiered Must-have / Good-to-have / Add-on (drives the verdict).
    const rubricSel = readSelection(posCfg?.rubricSelection)

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
        // Insufficient-evidence report (Fixpack 6 #3): not a pass/fail.
        sectionScores: {
          technical:  { score: null, outOf: 100, status: INSUFFICIENT_EVIDENCE },
          scenario:   { score: null, outOf: 100, status: INSUFFICIENT_EVIDENCE },
          behavioral: { score: null, outOf: 100, status: INSUFFICIENT_EVIDENCE },
          eq:         { score: null, outOf: 100, status: INSUFFICIENT_EVIDENCE },
          whiteboard: { score: null, outOf: 100, status: INSUFFICIENT_EVIDENCE },
        },
        communication: { status: INSUFFICIENT_EVIDENCE } as Prisma.InputJsonValue,
        insufficientEvidence: true,
        strengthAreas: [],
        concernAreas: ['No transcript or question responses were captured during the interview.'],
        questionWiseEvaluation: [],
        transcriptHighlights: [],
        hrNote: 'Transcript was not captured for this interview. Recommend re-interviewing the candidate.',
        l2Recommendation: '',
        mustHaveAssessment: (mustHaves.length
          ? reconcileMustHaves(mustHaves, null, { insufficientEvidence: true })
          : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        conceptAssessment: (conceptRubric.length
          ? reconcileConcepts(conceptRubric, null, { insufficientEvidence: true })
          : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        rubricAssessment: (rubricSel.length
          ? (() => { const items = reconcileRubricResults(rubricSel, null, { insufficientEvidence: true }); return { items, gate: applyTierVerdict('maybe', 0, items, { insufficientEvidence: true }).gate } })()
          : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
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
          console.error('[generate-report] Minimal report DB save failed:', msg)
          return fail(interviewId, `Report could not be saved: ${msg}`)
        }
      }
      await markReport(interviewId, 'ready')

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
      // Fixpack 6 #3: 4096 truncated full reports (long per-question JSON) →
      // JSON.parse failed → silent no-report. 16k fits comfortably; truncation
      // is now detected explicitly below.
      max_tokens: 16000,
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
            (conceptRubric.length
              ? `ROLE CONCEPT RUBRIC (derived from the JD — ground your scoring in these role-specific criteria). Rate EACH concept from the transcript only, against its anchors:\n` +
                conceptRubric.map((c, i) => `${i + 1}. ${c.concept}\n   strong looks like: ${c.strong || '—'}\n   weak looks like: ${c.weak || '—'}`).join('\n') + `\n` +
                `- "strong": matches the strong anchor with specifics. "adequate": correct but shallow or partial. "weak": matches the weak anchor or shows a clear gap.\n` +
                `- "not_assessed": the concept didn't come up in enough depth — do NOT guess. Let these ratings inform sectionScores and the recommendation.\n\n`
              : '') +
            (mustHaves.length
              ? `MUST-HAVE REQUIREMENTS (non-negotiable). Judge EACH one strictly from what the candidate said in the transcript — the resume alone is NOT evidence:\n` +
                mustHaves.map((m, i) => `${i + 1}. ${m}`).join('\n') + `\n` +
                `- "met": the candidate gave concrete, specific evidence (examples, depth, correct detail).\n` +
                `- "not_met": the candidate was asked about it and showed a clear gap, lack of experience, or incorrect understanding.\n` +
                `- "insufficient_evidence": it was not covered, or only superficially — do NOT guess.\n\n`
              : '') +
            (rubricSel.length
              ? `SELECTED ROLE RUBRICS (chosen by the recruiter from the rubric library, each with a tier). Rate EACH from the transcript only — the resume is NOT evidence:\n` +
                rubricSel.map((r, i) => `${i + 1}. [${TIER_INFO[r.tier].label}] ${r.subSkill} (id ${r.rubricId})\n   standard: ${r.statement}\n   strong looks like: ${r.strong || '—'}\n   weak looks like: ${r.weak || '—'}`).join('\n') + `\n` +
                `- "met": concrete, specific evidence matching the standard. "partial": correct but shallow or incomplete. "not_met": asked about it and showed a clear gap or incorrect understanding. "not_assessed": it did not come up in enough depth — do NOT guess.\n` +
                `- Rate honestly; the platform applies the tier policy (must-haves gate the verdict) itself — do not adjust your recommendation to compensate.\n\n`
              : '') +
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
            `  "l2Recommendation": "<what to focus on in L2 if proceeding>"` +
            (() => {
              const extra = [
                mustHaves.length ? `"mustHaveAssessment": [\n    { "requirement": "<exact requirement text from the list>", "status": "<met|not_met|insufficient_evidence>", "evidence": "<1 sentence citing what the candidate said, or why evidence is insufficient>" }\n  ]` : null,
                conceptRubric.length ? `"conceptAssessment": [\n    { "concept": "<exact concept name from the rubric>", "rating": "<strong|adequate|weak|not_assessed>", "evidence": "<1 sentence citing what the candidate said>" }\n  ]` : null,
                rubricSel.length ? `"rubricAssessment": [\n    { "rubricId": "<id from the list>", "subSkill": "<exact name>", "rating": "<met|partial|not_met|not_assessed>", "evidence": "<1 sentence citing what the candidate said>" }\n  ]` : null,
              ].filter(Boolean)
              return extra.length ? `,\n  ${extra.join(',\n  ')}\n` : `\n`
            })() +
            `}`,
        },
      ],
      // NOTE: SCORING_MODEL is Opus 4.8, which rejects temperature/top_p/top_k (400).
    })

    if (response.stop_reason === 'max_tokens') {
      console.error('[generate-report] Output truncated at max_tokens')
      return fail(interviewId, 'Report output was cut off (too long) — retry')
    }
    if (response.stop_reason === 'refusal') {
      return fail(interviewId, 'The scoring model declined to produce this report')
    }
    const raw = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('') || '{}'
    console.log('[generate-report] Claude raw response:', raw.slice(0, 300))
    // Tolerate a stray preamble/fence: take the outermost JSON object.
    const unfenced = raw.replace(/```json|```/g, '')
    const first = unfenced.indexOf('{'), last = unfenced.lastIndexOf('}')
    const clean = (first >= 0 && last > first ? unfenced.slice(first, last + 1) : unfenced).trim()

    let report
    try {
      report = JSON.parse(clean)
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError)
      console.error('[generate-report] JSON parse failed:', msg)
      console.error('[generate-report] Raw output (first 500 chars):', raw.slice(0, 500))
      return fail(interviewId, 'Report generation failed — invalid response format')
    }

    // ── Insufficient-evidence honesty (Build 01-B3) ───────────────────
    // Never emit a confident score for content that wasn't actually evaluable.
    {
      // Evidence = per-question responses; when none were captured (e.g. a
      // server-side regeneration from the persisted transcript), the
      // candidate's own transcript lines are the evidence.
      const qrEvidence = (Array.isArray(questionResponses) ? questionResponses : [])
        .map((r: { candidateResponse?: string }) => ({ response: r.candidateResponse }))
      const evResponses = qrEvidence.length ? qrEvidence : (Array.isArray(transcript) ? transcript : [])
        .filter((e: { speaker?: string }) => e.speaker === 'candidate')
        .map((e: { text?: string }) => ({ response: e.text }))
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
    let l2Threshold = 75

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
      l2Threshold = threshold
      l2Recommended = weightedScore >= threshold && ['yes', 'strong_yes'].includes(report.recommendation ?? '')
    } catch (rubricErr) {
      console.warn('[generate-report] Rubric weighting failed (non-fatal):', rubricErr)
    }

    // One verdict per configured must-have — never dropped, never invented.
    // Reconciled once so the response and the persisted report agree.
    report.conceptAssessment = conceptRubric.length
      ? reconcileConcepts(conceptRubric, report.conceptAssessment, { insufficientEvidence: report.insufficientEvidence === true })
      : undefined
    report.mustHaveAssessment = mustHaves.length
      ? reconcileMustHaves(mustHaves, report.mustHaveAssessment, { insufficientEvidence: report.insufficientEvidence === true })
      : undefined

    // ── Tier policy (rubric library) — deterministic, after the model ──
    // Must-haves gate the verdict (not met → "no"; partial / not assessed →
    // at most "maybe"); good-to-haves add to the score; add-ons are informational.
    let rubricAssessment: RubricAssessment | undefined
    if (rubricSel.length) {
      const insufficient = report.insufficientEvidence === true
      const items = reconcileRubricResults(rubricSel, report.rubricAssessment, { insufficientEvidence: insufficient })
      const tiered = applyTierVerdict(report.recommendation, weightedScore, items, { insufficientEvidence: insufficient })
      rubricAssessment = { items, gate: tiered.gate }
      if (!insufficient) {
        report.recommendation = tiered.recommendation
        weightedScore = tiered.score
        l2Recommended = weightedScore >= l2Threshold && ['yes', 'strong_yes'].includes(report.recommendation ?? '')
        if (tiered.gate.capped) report.concernAreas = [...(Array.isArray(report.concernAreas) ? report.concernAreas : []), ...tiered.gate.reasons.filter((r) => !r.startsWith('+'))]
      }
    }
    report.rubricAssessment = rubricAssessment

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
        mustHaveAssessment:     (report.mustHaveAssessment ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        conceptAssessment:      (report.conceptAssessment ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        rubricAssessment:       (rubricAssessment ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
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
            const baseUrl = appUrl()
            await sendEmail({
              to: recruiter.email,
              subject: `Report Ready — ${candidateName} for ${cand?.position?.title ?? positionTitle}`,
              html: `
                <p>Hi ${recruiter.name},</p>
                <p>The evaluation report for <strong>${candidateName}</strong> is ready.</p>
                <p><strong>Position:</strong> ${cand?.position?.title ?? positionTitle} at ${cand?.position?.company ?? company}<br/>
                <strong>Score:</strong> ${weightedScore}/100<br/>
                <strong>Recommendation:</strong> ${report.recommendation ?? 'maybe'}</p>
                <a href="${baseUrl}/report/${interviewId}"
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
          const reportAppUrl = appUrl()
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
        // Fatal now (Fixpack 6 #3): an unsaved report is invisible to the
        // recruiter, so flag it and let the caller / sweep retry.
        const msg = dbError instanceof Error ? dbError.message : String(dbError)
        console.error('[generate-report] DB save failed:', msg)
        return fail(interviewId, `Report could not be saved: ${msg}`)
      }
    } else {
      console.warn('[generate-report] No candidateId provided — skipping DB save')
      return fail(interviewId, 'No candidate linked to this interview — report not saved')
    }
    await markReport(interviewId, 'ready')
    // Observe & Defend: judgment axes for the work sample (separate from the
    // competency score). Non-fatal — the report is already saved.
    if (typeof interviewId === 'string' && interviewId) {
      await scoreWorkSample(interviewId).catch((e) => console.warn('[generate-report] work-sample scoring failed:', e instanceof Error ? e.message : e))
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
    return fail(interviewIdForStatus, message)
  }
}
