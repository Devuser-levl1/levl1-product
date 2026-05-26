import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { resumeText } = body

    console.log('extract-resume called, text length:', resumeText?.length)

    if (!resumeText) {
      return NextResponse.json({ error: 'No resume text provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log('API key present:', !!apiKey, 'length:', apiKey?.length)

    if (!apiKey) {
      return NextResponse.json(getMockExtraction(), { status: 200 })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a resume parser. Extract information accurately. Never guess. Only extract what is explicitly stated. Return ONLY valid JSON with no markdown, no code fences, no explanation.',
      messages: [{
        role: 'user',
        content: `Parse this resume and return a JSON object with these exact fields:
- name (string)
- email (string)
- phone (string or null)
- linkedIn (string or null)
- currentTitle (string or null)
- currentCompany (string or null)
- totalYearsExperience (number or null)
- topSkills (array of strings, max 8)
- educationSummary (string or null)
- extractionConfidence (high/medium/low)
- missingFields (array of field names that are null)

Resume:
${resumeText}`,
      }],
    })

    console.log('Claude response received')

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('Raw response:', raw.slice(0, 200))

    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Extraction failed'
    const stack   = err instanceof Error ? err.stack  : undefined
    console.error('extract-resume error:', message, stack)
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
