import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

// Structured requisition hints pulled from a job-spec email — used to pre-fill
// the job (location/rubric) and, when a client matches, a linked CRM deal with
// the deal-economics fields. All fields optional; best-effort (never blocks).
export interface RequisitionHints {
  role: string | null
  positions: number | null
  billRate: number | null
  currency: string | null
  hoursPerWeek: number | null
  durationValue: number | null
  durationUnit: 'weeks' | 'months' | null
  location: string | null
}

const EMPTY: RequisitionHints = { role: null, positions: null, billRate: null, currency: null, hoursPerWeek: null, durationValue: null, durationUnit: null, location: null }

export async function extractRequisitionHints(subject: string, body: string): Promise<RequisitionHints> {
  if (!process.env.ANTHROPIC_API_KEY) return EMPTY
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      temperature: 0,
      system: 'You extract structured staffing-requisition details from an email. Only extract values explicitly stated; use null when not present. Return ONLY JSON.',
      messages: [{
        role: 'user',
        content: `Extract requisition details as JSON (null when absent):
{"role": <string|null>, "positions": <int|null>, "billRate": <number|null>, "currency": <string|null>, "hoursPerWeek": <number|null>, "durationValue": <number|null>, "durationUnit": "weeks"|"months"|null, "location": <string|null>}
Notes: "4 Java devs" → positions 4, role "Java Developer". "$30/hr" → billRate 30, currency "USD". "6 months" → durationValue 6, durationUnit "months". "40 hrs/week" → hoursPerWeek 40.

Subject: ${subject}

Body:
${body.slice(0, 4000)}`,
      }],
    })
    const raw = res.content[0]?.type === 'text' ? res.content[0].text : '{}'
    const p = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Partial<RequisitionHints>
    const num = (v: unknown) => (v == null || isNaN(Number(v)) ? null : Number(v))
    return {
      role: typeof p.role === 'string' ? p.role : null,
      positions: num(p.positions),
      billRate: num(p.billRate),
      currency: typeof p.currency === 'string' ? p.currency : null,
      hoursPerWeek: num(p.hoursPerWeek),
      durationValue: num(p.durationValue),
      durationUnit: p.durationUnit === 'weeks' || p.durationUnit === 'months' ? p.durationUnit : null,
      location: typeof p.location === 'string' ? p.location : null,
    }
  } catch (e) {
    console.error('[hire/mailbox/extract-hints] failed:', e instanceof Error ? e.message : e)
    return EMPTY
  }
}

export function hasEconomicsHints(h: RequisitionHints): boolean {
  return [h.positions, h.billRate, h.hoursPerWeek, h.durationValue].some((v) => v != null && Number(v) > 0)
}
