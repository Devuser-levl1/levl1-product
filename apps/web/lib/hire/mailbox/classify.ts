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

export interface ResumeVerdict { isResume: boolean; confidence: number }

// Résumé detection — heuristic (no AI needed, robust + cheap). A message is a
// résumé if it carries a résumé-like attachment (pdf/docx/image), with higher
// confidence when the filename or body signals a CV/application.
const RESUME_FILE = /\.(pdf|docx?|png|jpe?g|webp)$/i
const RESUME_NAME_HINT = /\b(resume|résumé|cv|curriculum\s*vitae)\b/i
const RESUME_BODY_HINT = /\b(resume|résumé|\bcv\b|curriculum vitae|applying for|application for|please find (my|attached)|my (resume|cv)|attached is my|candidate for|years of experience)\b/i

export function classifyResume(subject: string, body: string, attachmentFilenames: string[]): ResumeVerdict {
  const resumeFiles = attachmentFilenames.filter((n) => RESUME_FILE.test(n))
  if (resumeFiles.length === 0) {
    // Body-only résumé (pasted CV) — weak signal, needs strong body hints.
    return RESUME_BODY_HINT.test(`${subject}\n${body}`) && /experience|education|skills/i.test(body)
      ? { isResume: true, confidence: 55 }
      : { isResume: false, confidence: 0 }
  }
  let confidence = 70
  if (resumeFiles.some((n) => RESUME_NAME_HINT.test(n))) confidence += 20
  if (RESUME_BODY_HINT.test(`${subject}\n${body}`)) confidence += 10
  return { isResume: true, confidence: Math.min(100, confidence) }
}
