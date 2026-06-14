import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
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

  const results = { created: 0, failed: 0, errors: [] as string[] }

  for (const raw of rawCandidates) {
    // Stop importing once the monthly candidate limit is hit (data is never deleted).
    const allow = await checkAllowance(ctx.tenantId, 'candidate')
    if (!allow.allowed) { results.errors.push(allow.message ?? 'Plan limit reached'); break }
    try {
      let data: RawCandidate = raw
      if (importType === 'resumes') {
        if (!raw.resumeText) { results.failed++; results.errors.push(`${raw.name || 'File'}: could not read or empty`); continue }
        const extracted = await extractCandidateFromResume(raw.resumeText)
        data = { ...extracted, resumeText: raw.resumeText }
      }

      const email = (data.email || '').toLowerCase().trim()
      if (!email) { results.failed++; results.errors.push(`${raw.name || 'Row'}: no email found`); continue }

      const exists = await prisma.hireCandidate.findFirst({
        where: { tenantId: ctx.tenantId, email, jobId: jobId || null },
        select: { id: true },
      })
      if (exists) { results.failed++; results.errors.push(`${email}: duplicate (already exists)`); continue }

      const candidate = await prisma.hireCandidate.create({
        data: {
          tenantId: ctx.tenantId,
          jobId: jobId || null,
          name: data.name || 'Unknown',
          email,
          phone: data.phone || null,
          currentTitle: data.currentTitle || data.currentRole || null,
          currentCompany: data.currentCompany || null,
          resumeText: data.resumeText || null,
          source: 'Bulk Import',
          currentStage: 'Sourced',
        },
      })

      await prisma.hireCandidateActivity.create({
        data: { candidateId: candidate.id, type: 'note', note: 'Added via bulk import', userId: ctx.userId },
      })
      await incrementUsage(ctx.tenantId, 'candidate')

      if (data.resumeText && jobId) {
        const { enqueue } = await import('@/lib/hire/jobs/queue')
        await enqueue('hire-score-candidate', { candidateId: candidate.id }).catch((e) => console.error('[hire/bulk] enqueue failed:', e))
      }

      results.created++
    } catch (e: unknown) {
      results.failed++
      results.errors.push(`${raw.name || 'Row'} failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log('[hire/bulk] done created=%d failed=%d', results.created, results.failed)
  return NextResponse.json(results)
})
