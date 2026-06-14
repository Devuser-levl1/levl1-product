import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import {
  extractTextFromFile, parseJD, validateUpload,
} from '@/lib/shared/file-parsing'

export const dynamic = 'force-dynamic'

// Parse an uploaded JD file (PDF/Word/txt) → return raw text + structured
// fields (title, skills…) so the job form can populate the description and
// optionally auto-fill the title. Job creation (with the 'job' allowance
// check) still happens via POST /api/hire/jobs.
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
  console.log('[hire/parse-jd] file=%s type=%s size=%d', file.name, file.type, buffer.length)

  let text: string
  try {
    text = await extractTextFromFile(buffer, file.type || 'application/octet-stream', file.name)
  } catch (e) {
    console.error('[hire/parse-jd] extract failed:', e)
    return NextResponse.json({ error: 'Could not read this file — it may be corrupt or image-only.' }, { status: 422 })
  }

  if (text.trim().length < 50) {
    return NextResponse.json({ error: 'Not enough text found in this file.' }, { status: 422 })
  }

  const parsed = await parseJD(text)
  console.log('[hire/parse-jd] parsed title=%s skills=%d', parsed.title, parsed.requiredSkills.length)
  return NextResponse.json({ text, parsed })
})
