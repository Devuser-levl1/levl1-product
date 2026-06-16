import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'
import {
  extractTextFromFile, extractCandidateFromResume, validateUpload,
} from '@/lib/shared/file-parsing'

export const dynamic = 'force-dynamic'

interface RawCandidate {
  name?: string | null
  email?: string | null
  phone?: string | null
  currentTitle?: string | null
  currentCompany?: string | null
  currentRole?: string | null
  linkedIn?: string | null
  totalYears?: number | null
  topSkills?: string[]
  resumeText?: string | null
}

export const POST = withHireAuth(async (req, ctx) => {
  const contentType = req.headers.get('content-type') ?? ''

  // ── Branch A: multipart/form-data — real resume FILES (.pdf/.docx/.doc/.txt) ──
  // Reuses the same per-candidate creation loop below; just adds server-side
  // text extraction so we accept actual files, not only pasted text.
  let jobId: string | null
  let importType: 'csv' | 'resumes'
  let rawCandidates: RawCandidate[]

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    jobId = (form.get('jobId') as string) || null
    importType = 'resumes'
    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    console.log('[hire/bulk] multipart upload: %d file(s) job=%s', files.length, jobId ?? 'none')

    rawCandidates = []
    for (const file of files) {
      const validationError = validateUpload(file.name, file.size)
      if (validationError) { rawCandidates.push({ name: file.name, resumeText: null }); continue }
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const resumeText = await extractTextFromFile(buffer, file.type || 'application/octet-stream', file.name)
        rawCandidates.push({ name: file.name, resumeText: resumeText.trim().length >= 20 ? resumeText : null })
      } catch (e) {
        console.error('[hire/bulk] extract failed for %s:', file.name, e)
        rawCandidates.push({ name: file.name, resumeText: null })
      }
    }
  } else {
    // ── Branch B: JSON — pasted CSV rows or pasted resume text blocks ──
    const body = await req.json()
    jobId = body.jobId || null
    importType = body.importType === 'resumes' ? 'resumes' : 'csv'
    rawCandidates = Array.isArray(body.candidates) ? body.candidates : []
  }

  const results = { created: 0, failed: 0, needsReview: 0, errors: [] as string[] }

  let index = 0
  for (const raw of rawCandidates) {
    // Stop importing once the monthly candidate limit is hit (data is never deleted).
    const allow = await checkAllowance(ctx.tenantId, 'candidate')
    if (!allow.allowed) { results.errors.push(allow.message ?? 'Plan limit reached'); break }
    try {
      let data: RawCandidate = raw
      if (importType === 'resumes') {
        // ONLY a truly empty / unreadable file fails — a parsed name with no
        // email is still a valid sourced candidate.
        if (!raw.resumeText) { results.failed++; results.errors.push(`${raw.name || 'File'}: empty or unreadable file`); continue }
        const extracted = await extractCandidateFromResume(raw.resumeText, raw.name || 'resume')
        data = { ...extracted, resumeText: raw.resumeText }
        if (index === 0) {
          console.log('[hire/bulk] first candidate diagnostics — resumeTextLen=%d parsed=%j',
            raw.resumeText.length,
            { name: extracted.name, email: extracted.email, phone: extracted.phone, title: extracted.currentTitle, company: extracted.currentCompany, years: extracted.totalYears, skills: extracted.topSkills })
        }
      }
      index++

      const name = (data.name || '').trim()
      const email = (data.email || '').toLowerCase().trim() || null
      // Need at least a name OR an email to have a meaningful record.
      if (!name && !email) { results.failed++; results.errors.push(`${raw.name || 'Row'}: no name or email could be read`); continue }

      // Dedupe only when there's an email to match on.
      if (email) {
        const exists = await prisma.hireCandidate.findFirst({
          where: { tenantId: ctx.tenantId, email, jobId: jobId || null },
          select: { id: true },
        })
        if (exists) { results.failed++; results.errors.push(`${email}: duplicate (already exists)`); continue }
      }

      const skills = Array.isArray(data.topSkills) && data.topSkills.length ? (data.topSkills as Prisma.InputJsonValue) : undefined
      const candidate = await prisma.hireCandidate.create({
        data: {
          tenantId: ctx.tenantId,
          jobId: jobId || null,
          name: name || 'Unknown',
          email,                                        // may be null — sourced candidate without an email yet
          phone: data.phone || null,
          currentTitle: data.currentTitle || data.currentRole || null,
          currentCompany: data.currentCompany || null,
          linkedinUrl: data.linkedIn || null,
          totalYears: typeof data.totalYears === 'number' ? data.totalYears : null,
          ...(skills !== undefined ? { skills } : {}),  // persisted parsed skills
          resumeText: data.resumeText || null,
          source: 'Bulk Import',
          currentStage: 'Sourced',
        },
      })

      await prisma.hireCandidateActivity.create({
        data: { candidateId: candidate.id, type: 'note', note: 'Added via bulk import', userId: ctx.userId },
      })
      // Flag candidates that came in without an email for follow-up.
      if (!email) {
        results.needsReview++
        await prisma.hireCandidateActivity.create({
          data: { candidateId: candidate.id, type: 'note', note: 'Needs review — email not detected, please add', userId: ctx.userId },
        })
      }
      await incrementUsage(ctx.tenantId, 'candidate')

      // WITH a job → score against the JD. WITHOUT a job → generate a baseline
      // résumé summary (no score) so the candidate has a summary + skills; JD
      // scoring is deferred until they're attached to a job (PATCH route).
      if (data.resumeText) {
        const { enqueue } = await import('@/lib/hire/jobs/queue')
        const job = jobId ? 'hire-score-candidate' : 'hire-baseline-summary'
        await enqueue(job, { candidateId: candidate.id }).catch((e) => console.error('[hire/bulk] enqueue failed:', e))
      }

      results.created++
    } catch (e: unknown) {
      results.failed++
      results.errors.push(`${raw.name || 'Row'} failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log('[hire/bulk] done created=%d failed=%d needsReview=%d', results.created, results.failed, results.needsReview)
  return NextResponse.json(results)
})
