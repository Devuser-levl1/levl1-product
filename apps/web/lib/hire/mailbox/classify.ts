import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

export interface JobSpecVerdict { isJobSpec: boolean; confidence: number }

// Cheap classifier: is this inbound email a job spec / hiring requirement a
// recruiter would turn into a position? Returns a 0-100 confidence. Best-effort:
// any failure → not flagged (never blocks a sync).
export async function classifyJobSpec(subject: string, body: string): Promise<JobSpecVerdict> {
  if (!process.env.ANTHROPIC_API_KEY) return { isJobSpec: false, confidence: 0 }
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 80,
      temperature: 0,
      system: 'You classify recruiting inbound email. Decide if a message is a JOB SPECIFICATION / hiring requirement (a client/employer describing a role they want filled: title, skills, experience, headcount). Newsletters, applications from candidates, invoices, and generic mail are NOT job specs. Return ONLY JSON.',
      messages: [{ role: 'user', content: `Return ONLY JSON: {"isJobSpec": <bool>, "confidence": <0-100>}\n\nSubject: ${subject}\n\nBody:\n${body.slice(0, 4000)}` }],
    })
    const raw = res.content[0]?.type === 'text' ? res.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { isJobSpec?: boolean; confidence?: number }
    const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)))
    return { isJobSpec: !!parsed.isJobSpec && confidence >= 50, confidence }
  } catch (e) {
    console.error('[hire/mailbox/classify] failed:', e instanceof Error ? e.message : e)
    return { isJobSpec: false, confidence: 0 }
  }
}
