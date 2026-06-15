/* eslint-disable @typescript-eslint/no-require-imports */
// Shared file-parsing module used by BOTH Levl1 Interviews and Levl1 Hire.
// This consolidates the parsing logic that previously lived in
// lib/parseResume.ts (extractTextFromFile), app/api/extract-resume (resume →
// candidate fields via Claude) and app/api/positions/parse-jd (JD → structured
// fields via Claude). Do not duplicate this logic elsewhere — import from here.
//
// mammoth and pdf-parse are CommonJS — ESM `import` resolves to `.default`
// which is undefined at runtime, causing silent 500s. Use require().
import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

const mammoth = require('mammoth') as {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string; messages: unknown[] }>
}
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (options: { data: Uint8Array }) => { getText(): Promise<{ text: string }> }
}

// Re-export the client-safe constants/validators so server code can import
// everything from one place. Client components should import these from
// '@/lib/shared/file-constants' to avoid pulling pdf-parse/mammoth into the bundle.
export { MAX_FILE_SIZE, ACCEPTED_EXTENSIONS, FILE_ACCEPT_ATTR, isSupportedFile, validateUpload } from '@/lib/shared/file-constants'

const MODEL = CLAUDE_MODEL

// ── 1. Raw text extraction (pdf-parse + mammoth) ──────────────────────────
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const name = fileName.toLowerCase()

  // DOCX / DOC (mammoth handles both)
  if (
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return cleanText(result.value)
  }

  // PDF
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return cleanText(result.text)
  }

  // Plain text
  if (name.endsWith('.txt') || mimeType === 'text/plain') {
    return cleanText(buffer.toString('utf-8'))
  }

  throw new Error(`Unsupported file type: ${fileName}`)
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .trim()
}

// ── 2. Resume text → structured candidate fields (Claude) ─────────────────
export interface ResumeCandidate {
  name: string | null
  email: string | null
  phone: string | null
  currentTitle: string | null
  currentCompany: string | null
  linkedIn: string | null
  totalYears: number | null
  topSkills: string[]
}

export async function extractCandidateFromResume(
  resumeText: string,
  fileName = 'resume',
): Promise<ResumeCandidate> {
  // Regex pre-pass — used as a fallback to fill anything Claude misses (and the
  // sole source when no API key is configured, e.g. local/dev).
  const emailMatch = resumeText.match(/[\w.+-]+@[\w.-]+\.\w+/)
  const phoneMatch = resumeText.match(/(\+91[\s-]?|91[\s-]?|0[\s-]?)?[6-9]\d{9}/)
  const linkedInMatch = resumeText.match(/linkedin\.com\/in\/([\w-]+)/)
  const fallback: ResumeCandidate = {
    name: null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    linkedIn: linkedInMatch ? `linkedin.com/in/${linkedInMatch[1]}` : null,
    currentTitle: null,
    currentCompany: null,
    totalYears: null,
    topSkills: [],
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[file-parsing] No ANTHROPIC_API_KEY — using regex-only extraction')
    return fallback
  }

  try {
    const client = new Anthropic({ apiKey })
    const isWordDoc = /\.(docx?|doc)$/i.test(fileName)
    const cleaned = resumeText.substring(0, 6000)

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0,
      system:
        'You are a resume parser. Extract information accurately from imperfectly formatted text. ' +
        'Never guess. Only extract what is explicitly stated. ' +
        'Return ONLY valid JSON with no markdown, no code fences, no explanation.',
      messages: [{
        role: 'user',
        content:
          `Below is resume text extracted from a ${isWordDoc ? 'Word' : 'PDF/text'} document. ` +
          `Parse it carefully even if formatting is imperfect. ` +
          `The candidate's FULL NAME is almost always the very first line / largest heading at the TOP ` +
          `of the resume (before the contact details) — extract it even if the email is missing. ` +
          `Also look for email patterns (x@x.x), phone numbers (+91 or 10 digit Indian mobile), ` +
          `skills (in a skills section or throughout experience).\n\n` +
          `Return ONLY this JSON, no markdown, no explanation:\n` +
          `{\n` +
          `  "name": "the candidate's full name from the top of the resume, or null",\n` +
          `  "email": "email address or null",\n` +
          `  "phone": "phone number or null",\n` +
          `  "linkedIn": "linkedin url or null",\n` +
          `  "currentTitle": "most recent job title or null",\n` +
          `  "currentCompany": "most recent company or null",\n` +
          `  "totalYears": number or null,\n` +
          `  "topSkills": ["skill1", "skill2"]\n` +
          `}\n\nResume text:\n${cleaned}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Partial<ResumeCandidate>

    return {
      name: parsed.name || null,
      email: parsed.email || fallback.email,
      phone: parsed.phone || fallback.phone,
      linkedIn: parsed.linkedIn || fallback.linkedIn,
      currentTitle: parsed.currentTitle || null,
      currentCompany: parsed.currentCompany || null,
      totalYears: typeof parsed.totalYears === 'number' ? parsed.totalYears : null,
      topSkills: Array.isArray(parsed.topSkills) ? parsed.topSkills : [],
    }
  } catch (err) {
    console.error('[file-parsing] extractCandidateFromResume failed, using regex fallback:', err)
    return fallback
  }
}

// ── 3. JD text → structured job fields (Claude) ───────────────────────────
export interface ParsedJD {
  title: string | null
  requiredSkills: string[]
  niceToHaveSkills: string[]
  experienceLevel: string | null
  roleType: string | null
  seniorityLevel: string | null
  keyResponsibilities: string[]
  extractedTechStack: string[]
}

export async function parseJD(jdText: string): Promise<ParsedJD> {
  const empty: ParsedJD = {
    title: null, requiredSkills: [], niceToHaveSkills: [], experienceLevel: null,
    roleType: null, seniorityLevel: null, keyResponsibilities: [], extractedTechStack: [],
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[file-parsing] No ANTHROPIC_API_KEY — skipping JD parse')
    return empty
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0,
      system: 'You are a JD parser. Extract structured information from job descriptions. Return only valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Parse this job description and return JSON with these exact fields:
{
  "title": "concise job title or null",
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "experienceLevel": "X-Y years",
  "roleType": "IC/Manager/Lead/Director/VP/PM",
  "seniorityLevel": "junior/mid/senior/lead/principal/manager/director",
  "keyResponsibilities": ["responsibility1", "responsibility2"],
  "extractedTechStack": ["tech1", "tech2"]
}

JD: ${jdText.slice(0, 8000)}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()) as Partial<ParsedJD>
    return {
      title: parsed.title || null,
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      niceToHaveSkills: Array.isArray(parsed.niceToHaveSkills) ? parsed.niceToHaveSkills : [],
      experienceLevel: parsed.experienceLevel || null,
      roleType: parsed.roleType || null,
      seniorityLevel: parsed.seniorityLevel || null,
      keyResponsibilities: Array.isArray(parsed.keyResponsibilities) ? parsed.keyResponsibilities : [],
      extractedTechStack: Array.isArray(parsed.extractedTechStack) ? parsed.extractedTechStack : [],
    }
  } catch (err) {
    console.error('[file-parsing] parseJD failed:', err)
    return empty
  }
}
