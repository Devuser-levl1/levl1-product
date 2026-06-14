import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import {
  extractTextFromFile, extractCandidateFromResume, validateUpload,
} from '@/lib/shared/file-parsing'

export const dynamic = 'force-dynamic'

// Parse a single uploaded resume and return the extracted fields so the
// "Add Candidate" modal can auto-fill. Does NOT create a candidate — creation
// (with allowance check + AI scoring) happens via POST /api/hire/candidates.
export const POST = withHireAuth(async (req) => {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const validationError = validateUpload(file.name, file.size)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  console.log('[hire/parse-resume] file=%s type=%s size=%d', file.name, file.type, buffer.length)

  let resumeText: string
  try {
    resumeText = await extractTextFromFile(buffer, file.type || 'application/octet-stream', file.name)
  } catch (e) {
    console.error('[hire/parse-resume] extract failed:', e)
    return NextResponse.json({ error: 'Could not read this file — it may be corrupt or image-only.' }, { status: 422 })
  }

  if (resumeText.trim().length < 20) {
    return NextResponse.json({ error: 'Not enough text found in this file.' }, { status: 422 })
  }

  const fields = await extractCandidateFromResume(resumeText, file.name)
  console.log('[hire/parse-resume] extracted name=%s email=%s', fields.name, fields.email)
  return NextResponse.json({ ...fields, resumeText })
})
