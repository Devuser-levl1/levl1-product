import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'

export const dynamic = 'force-dynamic'

interface RawCandidate {
  name?: string
  email?: string
  phone?: string
  currentTitle?: string
  currentRole?: string
  resumeText?: string
}

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  const jobId: string | null = body.jobId || null
  const importType: 'csv' | 'resumes' = body.importType === 'resumes' ? 'resumes' : 'csv'
  const rawCandidates: RawCandidate[] = Array.isArray(body.candidates) ? body.candidates : []

  const results = { created: 0, failed: 0, errors: [] as string[] }

  for (const raw of rawCandidates) {
    // Stop importing once the monthly candidate limit is hit (data is never deleted).
    const allow = await checkAllowance(ctx.tenantId, 'candidate')
    if (!allow.allowed) { results.errors.push(allow.message ?? 'Plan limit reached'); break }
    try {
      let data: RawCandidate = raw
      if (importType === 'resumes' && raw.resumeText) {
        const extracted = await extractCandidateFromResume(raw.resumeText)
        data = { ...extracted, resumeText: raw.resumeText }
      }

      const email = (data.email || '').toLowerCase().trim()
      if (!email) { results.failed++; results.errors.push('Row failed: no email'); continue }

      const exists = await prisma.hireCandidate.findFirst({
        where: { tenantId: ctx.tenantId, email, jobId: jobId || null },
        select: { id: true },
      })
      if (exists) { results.failed++; results.errors.push(`${email}: already exists`); continue }

      const candidate = await prisma.hireCandidate.create({
        data: {
          tenantId: ctx.tenantId,
          jobId: jobId || null,
          name: data.name || 'Unknown',
          email,
          phone: data.phone || null,
          currentTitle: data.currentTitle || data.currentRole || null,
          resumeText: data.resumeText || null,
          source: 'Bulk Import',
          currentStage: 'Sourced',
        },
      })

      await prisma.hireCandidateActivity.create({
        data: { candidateId: candidate.id, type: 'note', note: 'Added via bulk import', userId: ctx.userId },
      })
      await incrementUsage(ctx.tenantId, 'candidate')

      if (data.resumeText && jobId) {
        const { enqueue } = await import('@/lib/hire/jobs/queue')
        await enqueue('hire-score-candidate', { candidateId: candidate.id }).catch((e) => console.error('[hire/bulk] enqueue failed:', e))
      }

      results.created++
    } catch (e: unknown) {
      results.failed++
      results.errors.push(`Row failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json(results)
})

async function extractCandidateFromResume(resumeText: string): Promise<RawCandidate> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `Extract contact information from this resume. Return ONLY valid JSON:
{
  "name": "<full name>",
  "email": "<email address>",
  "phone": "<phone number or null>",
  "currentTitle": "<current job title or null>",
  "currentCompany": "<current company or null>",
  "totalYears": <years of experience as number or null>
}

Resume:
${resumeText.slice(0, 1500)}`,
    }],
  })
  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim()) as RawCandidate
}
