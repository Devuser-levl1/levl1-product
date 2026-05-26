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
    let fileType   = 'text'

    // ── Branch A: multipart/form-data (real file upload) ─────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 })
      }

      fileName = file.name
      fileType = file.type || 'application/octet-stream'
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
      fileType   = 'text'
      console.log(`JSON body received | text length: ${resumeText?.length}`)
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json({ error: 'Resume text is too short or empty' }, { status: 400 })
    }

    // ── Mock fallback when no API key ─────────────────────────────────────
    if (!apiKey) {
      console.warn('No ANTHROPIC_API_KEY — returning mock data')
      return NextResponse.json(getMockExtraction(), { status: 200 })
    }

    // ── Claude extraction ─────────────────────────────────────────────────
    const client = new Anthropic({ apiKey })

    const isWordDoc = fileName.toLowerCase().endsWith('.docx') ||
                      fileName.toLowerCase().endsWith('.doc')

    const fileNote = isWordDoc
      ? 'The resume text below was extracted from a Word document and should be well structured. Extract all fields accurately.'
      : ''

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You are a resume parser. Extract information accurately. Never guess. ' +
        'Only extract what is explicitly stated. ' +
        'Return ONLY valid JSON with no markdown, no code fences, no explanation.',
      messages: [
        {
          role: 'user',
          content:
            `Parse this resume and return a JSON object with these exact fields:\n` +
            `- name (string)\n` +
            `- email (string)\n` +
            `- phone (string or null)\n` +
            `- linkedIn (string or null)\n` +
            `- currentTitle (string or null)\n` +
            `- currentCompany (string or null)\n` +
            `- totalYearsExperience (number or null)\n` +
            `- topSkills (array of strings, max 8)\n` +
            `- educationSummary (string or null)\n` +
            `- extractionConfidence (high/medium/low)\n` +
            `- missingFields (array of field names that are null)\n\n` +
            (fileNote ? `${fileNote}\n\n` : '') +
            `Resume:\n${resumeText.substring(0, 6000)}`,
        },
      ],
    })

    console.log('Claude response received')

    const raw   = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('Raw response (first 200):', raw.slice(0, 200))

    const clean  = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

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
