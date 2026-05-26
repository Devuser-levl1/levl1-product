import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SECTION_DESC: Record<string, string> = {
  technical:  'Technical knowledge, concepts and skills questions',
  scenario:   'Real-world scenario and problem-solving questions',
  behavioral: 'Behavioral STAR-method questions about past experience',
  eq:         'Emotional intelligence and values-based questions',
  whiteboard: 'System design and whiteboard challenge questions',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sectionType        = 'technical',
      positionTitle      = '',
      experienceLevel    = '',
      techStack          = [] as string[],
      domainContext       = '',
      existingQuestionTexts = [] as string[],
      removedQuestionTexts  = [] as string[],
      count              = 5,
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const existingList = existingQuestionTexts.length
      ? existingQuestionTexts.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')
      : 'None yet'

    const removedList = removedQuestionTexts.length
      ? removedQuestionTexts.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')
      : 'None'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system:
        `You are a senior technical interviewer. ` +
        `Generate exactly ${count} new interview question${count !== 1 ? 's' : ''} for the ${sectionType} section. ` +
        `Do NOT repeat, rephrase, or paraphrase any existing questions. ` +
        `Do NOT regenerate any of the removed questions listed. ` +
        `Focus on angles not yet covered by existing questions. ` +
        `Return ONLY a valid JSON array — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content:
          `Generate ${count} new ${SECTION_DESC[sectionType] ?? sectionType} for:\n` +
          `Role: "${positionTitle}" (${experienceLevel})\n` +
          `Tech stack: ${techStack.join(', ') || 'General'}\n` +
          `Domain: ${domainContext || 'Tech'}\n\n` +
          `EXISTING QUESTIONS — do not repeat:\n${existingList}\n\n` +
          `REMOVED QUESTIONS — do not regenerate:\n${removedList}\n\n` +
          `Return ONLY a JSON array where each element is:\n` +
          `{\n` +
          `  "id": "unique_string",\n` +
          `  "question": "full question text",\n` +
          `  "expectedKeyPoints": ["point1", "point2", "point3"],\n` +
          `  "followUp": "follow-up probe question",\n` +
          `  "difficulty": "basic|intermediate|advanced",\n` +
          `  "techTag": "relevant technology or skill",\n` +
          `  "estimatedMinutes": 2\n` +
          `}`,
      }],
    })

    const raw   = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    const arr   = JSON.parse(clean)

    // Guarantee stable unique IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = arr.map((q: any, i: number) => ({
      ...q,
      id: `gen_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    }))

    return NextResponse.json({ questions }, { status: 200 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    console.error('generate-more-questions error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
