import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { extractTextFromFile } from '@/lib/parseResume'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''
    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log('extract-resume called | content-type:', contentType)
    console.log('API key present:', !!apiKey, '| length:', apiKey?.length)

    let resumeText = ''
    let fileName   = 'resume'

    // ── Branch A: multipart/form-data (real file upload) ─────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 })
      }

      fileName = file.name
      const fileType = file.type || 'application/octet-stream'
      const buffer = Buffer.from(await file.arrayBuffer())

      console.log(`File received: "${fileName}" | type: ${fileType} | size: ${buffer.length} bytes`)

      try {
        resumeText = await extractTextFromFile(buffer, fileType, fileName)
        console.log(`Text extracted from file | length: ${resumeText.length} chars`)
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : 'File parsing failed'
        console.error('File parse error:', msg)
        return NextResponse.json({ error: msg }, { status: 422 })
      }

    // ── Branch B: JSON (paste tab) ────────────────────────────────────────
    } else {
      const body = await req.json()
      resumeText = body.resumeText ?? ''
      fileName   = body.fileName  ?? 'pasted-resume'
      console.log(`JSON body received | text length: ${resumeText?.length}`)
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json({ error: 'Resume text is too short or empty' }, { status: 400 })
    }

    // ── Regex pre-pass (used as fallback after Claude) ────────────────────
    const emailMatch    = resumeText.match(/[\w.+-]+@[\w.-]+\.\w+/)
    const phoneMatch    = resumeText.match(/(\+91[\s-]?|91[\s-]?|0[\s-]?)?[6-9]\d{9}/)
    const linkedInMatch = resumeText.match(/linkedin\.com\/in\/([\w-]+)/)

    // ── Mock fallback when no API key ─────────────────────────────────────
    if (!apiKey) {
      console.warn('No ANTHROPIC_API_KEY — returning mock data')
      return NextResponse.json(getMockExtraction(), { status: 200 })
    }

    // ── Claude extraction ─────────────────────────────────────────────────
    const client = new Anthropic({ apiKey })

    const isWordDoc = fileName.toLowerCase().endsWith('.docx') ||
                      fileName.toLowerCase().endsWith('.doc')

    const cleanedText = resumeText.substring(0, 6000)

    console.log(
      'Sending to Claude, length:', cleanedText.length,
      'preview:', cleanedText.slice(0, 300)
    )

    const userPrompt =
      `Below is resume text extracted from a ${isWordDoc ? 'Word' : 'PDF'} document. ` +
      `Parse it carefully even if formatting is imperfect. ` +
      `Look for email patterns (x@x.x), phone numbers (+91 or 10 digit Indian mobile), ` +
      `name (usually at the top), skills (in a skills section or mentioned throughout experience).\n\n` +
      `Return ONLY this JSON, no markdown, no explanation:\n` +
      `{\n` +
      `  "name": "full name or null",\n` +
      `  "email": "email address or null",\n` +
      `  "phone": "phone number or null",\n` +
      `  "linkedIn": "linkedin url or null",\n` +
      `  "currentTitle": "most recent job title or null",\n` +
      `  "currentCompany": "most recent company or null",\n` +
      `  "totalYearsExperience": "number or null",\n` +
      `  "topSkills": ["skill1", "skill2"],\n` +
      `  "educationSummary": "degree and institution or null",\n` +
      `  "extractionConfidence": "high or medium or low",\n` +
      `  "missingFields": ["list of field names that returned null"]\n` +
      `}\n\n` +
      `Resume text:\n${cleanedText}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You are a resume parser. Extract information accurately from imperfectly formatted text. ' +
        'Never guess. Only extract what is explicitly stated. ' +
        'Return ONLY valid JSON with no markdown, no code fences, no explanation.',
      messages: [{ role: 'user', content: userPrompt }],
    })

    console.log('Claude response received')

    const raw   = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('Raw response (first 200):', raw.slice(0, 200))

    const clean  = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // ── Regex fallback — fill any null fields Claude missed ───────────────
    if (!parsed.email && emailMatch)       parsed.email    = emailMatch[0]
    if (!parsed.phone && phoneMatch)       parsed.phone    = phoneMatch[0]
    if (!parsed.linkedIn && linkedInMatch) parsed.linkedIn = `linkedin.com/in/${linkedInMatch[1]}`

    // Ensure arrays are always arrays
    if (!Array.isArray(parsed.topSkills))     parsed.topSkills    = []
    if (!Array.isArray(parsed.missingFields)) parsed.missingFields = []

    // Return raw text so the UI can show "View extracted text" per candidate
    parsed.rawExtractedText = cleanedText

    return NextResponse.json(parsed, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Extraction failed'
    const stack   = err instanceof Error ? err.stack  : undefined
    console.error('extract-resume unhandled error:', message)
    console.error(stack)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getMockExtraction() {
  return {
    name: 'Sample Candidate',
    email: 'candidate@email.com',
    phone: '+91-98000-00000',
    linkedIn: null,
    currentTitle: 'Software Engineer',
    currentCompany: 'Tech Company',
    totalYearsExperience: 5,
    topSkills: ['JavaScript', 'React', 'Node.js'],
    educationSummary: 'B.Tech Computer Science',
    extractionConfidence: 'high',
    missingFields: [],
  }
}
