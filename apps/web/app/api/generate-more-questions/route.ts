import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREEN_UTILITY_MODEL } from '@/lib/screen/interview/model'
import { recruiterAccess } from '@/lib/screen/recruiter/access'

const SECTION_DESC: Record<string, string> = {
  technical:  'Technical knowledge, concepts and skills questions',
  scenario:   'Real-world scenario and problem-solving questions',
  behavioral: 'Conversational behavioral questions about how they work with people and handle pressure — never mention STAR or any answer framework',
  eq:         'Emotional intelligence and values-based questions',
  whiteboard: 'System design and whiteboard challenge questions',
}

export async function POST(req: NextRequest) {
  // Was unauthenticated — anyone could spend the AI budget. Recruiters only.
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
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
      model: SCREEN_UTILITY_MODEL,
      // Fixpack 9 #4: was a flat 2048 — 5 system-design questions use ~1.6–1.8k
      // tokens, so whiteboard batches were intermittently CUT OFF mid-JSON and
      // failed with a raw parse error ("nothing happened"). Scale with the ask.
      max_tokens: Math.min(12000, Math.max(1, Number(count) || 5) * (sectionType === 'whiteboard' || sectionType === 'scenario' ? 1400 : 800) + 600),
      system:
        `You are a senior technical interviewer. ` +
        `Generate exactly ${count} new interview question${count !== 1 ? 's' : ''} for the ${sectionType} section. ` +
        `Do NOT repeat, rephrase, or paraphrase any existing questions. ` +
        `Do NOT regenerate any of the removed questions listed. ` +
        `Focus on angles not yet covered by existing questions. ` +
        `Plain text only — no emoji, symbols or decorative characters. ` +
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

    if (response.stop_reason === 'max_tokens') {
      console.error(JSON.stringify({ evt: 'generate_more_truncated', sectionType, count, output_tokens: response.usage.output_tokens }))
      return NextResponse.json({ error: 'The AI response was too long and got cut off. Please try again, or ask for fewer questions.' }, { status: 502 })
    }
    const raw   = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const start = raw.indexOf('['), end = raw.lastIndexOf(']')
    let arr: unknown
    try { arr = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw.replace(/```json|```/g, '').trim()) }
    catch { return NextResponse.json({ error: 'The AI returned an unreadable answer. Please try again.' }, { status: 502 }) }
    if (!Array.isArray(arr) || arr.length === 0) return NextResponse.json({ error: 'No questions came back. Please try again.' }, { status: 502 })

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
