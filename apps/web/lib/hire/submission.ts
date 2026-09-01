import ExcelJS from 'exceljs'
import { columnLabel } from './submission-columns'

// Server-side Excel/résumé generation for client submissions. The column
// catalog + resolveColumns live in ./submission-columns (no server deps) so
// client components can import them; re-exported here for server callers.
export { SUBMISSION_COLUMN_CATALOG, DEFAULT_SUBMISSION_COLUMNS, resolveColumns, columnLabel } from './submission-columns'
export type { SubmissionColumn } from './submission-columns'

// Candidate shape needed to derive cells + résumé docs.
export interface SubmissionCandidate {
  id: string; name: string; email: string | null; phone: string | null
  currentTitle: string | null; currentCompany: string | null; totalYears: number | null
  skills: unknown; topSkills: unknown; aiScore: number | null; aiRecommendation: string | null
  aiSummary: string | null; source: string | null; currentStage: string; resumeText: string | null
  matchScore?: number | null // job-relative score when available
}

function skillList(c: SubmissionCandidate): string[] {
  const pick = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x) => typeof x === 'string') as string[] : [])
  const top = pick(c.topSkills)
  return (top.length ? top : pick(c.skills))
}

const REC_LABEL: Record<string, string> = { strong_yes: 'Strong yes', yes: 'Yes', maybe: 'Maybe', no: 'No' }

/** Derive one cell value (string) for a candidate + column key. */
export function deriveCell(c: SubmissionCandidate, key: string): string {
  switch (key) {
    case 'name': return c.name
    case 'currentTitle': return c.currentTitle ?? ''
    case 'currentCompany': return c.currentCompany ?? ''
    case 'experience': return c.totalYears != null ? `${c.totalYears} yr${c.totalYears === 1 ? '' : 's'}` : ''
    case 'email': return c.email ?? ''
    case 'phone': return c.phone ?? ''
    case 'skills': return skillList(c).join(', ')
    case 'matchScore': { const s = c.matchScore ?? c.aiScore; return s != null ? String(s) : '' }
    case 'recommendation': return c.aiRecommendation ? (REC_LABEL[c.aiRecommendation] ?? c.aiRecommendation) : ''
    case 'source': return c.source ?? ''
    case 'stage': return c.currentStage ?? ''
    case 'summary': return c.aiSummary ?? ''
    default: return ''
  }
}

/** Build the .xlsx candidate summary (one row per candidate) as a Buffer. */
export async function buildSummaryXlsx(opts: {
  columns: string[]; candidates: SubmissionCandidate[]; clientName: string; jobTitle?: string | null
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'HirePilot'
  wb.created = new Date()
  const ws = wb.addWorksheet('Candidates')

  ws.columns = opts.columns.map((k) => ({
    header: columnLabel(k), key: k,
    width: k === 'skills' || k === 'summary' ? 42 : k === 'name' || k === 'currentTitle' || k === 'currentCompany' ? 24 : 16,
  }))

  // Header styling.
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } }
  header.alignment = { vertical: 'middle' }
  header.height = 20

  for (const c of opts.candidates) {
    const row: Record<string, string> = {}
    for (const k of opts.columns) row[k] = deriveCell(c, k)
    ws.addRow(row)
  }
  ws.eachRow((r) => { r.alignment = { ...r.alignment, wrapText: true, vertical: 'top' } })

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

/** A clean text résumé built from stored data (we store extracted text, not the
 *  original file) — attached per candidate so the client always gets a résumé. */
export function resumeTextDoc(c: SubmissionCandidate): string {
  const lines: string[] = []
  lines.push(c.name)
  const sub = [c.currentTitle, c.currentCompany].filter(Boolean).join(' · ')
  if (sub) lines.push(sub)
  const contact = [c.email, c.phone].filter(Boolean).join(' · ')
  if (contact) lines.push(contact)
  if (c.totalYears != null) lines.push(`Experience: ${c.totalYears} year${c.totalYears === 1 ? '' : 's'}`)
  const sk = skillList(c)
  if (sk.length) lines.push(`Key skills: ${sk.join(', ')}`)
  lines.push('')
  lines.push('—'.repeat(48))
  lines.push('')
  lines.push((c.resumeText ?? '').trim() || '(No résumé text on file for this candidate.)')
  return lines.join('\n')
}

/** Filesystem-safe base for an attachment filename from a person's name. */
export function safeFileBase(name: string): string {
  return (name || 'candidate').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'candidate'
}
