import { prisma } from '@/lib/prisma'

export interface Recipient { name: string; email: string; job?: string; company?: string }

interface AudienceFilter { jobId?: string; stage?: string; source?: string; clientId?: string }

export async function resolveAudience(tenantId: string, audienceType: string, filter: AudienceFilter): Promise<Recipient[]> {
  if (audienceType === 'contacts') {
    const contacts = await prisma.hireContact.findMany({
      where: {
        client: { tenantId, ...(filter.clientId ? { id: filter.clientId } : {}) },
        email: { not: null },
        emailOptOut: false,
      },
      select: { name: true, email: true, client: { select: { name: true } } },
    })
    return contacts.filter((c) => c.email).map((c) => ({ name: c.name, email: c.email as string, company: c.client?.name }))
  }
  const candidates = await prisma.hireCandidate.findMany({
    where: {
      tenantId,
      emailOptOut: false,
      ...(filter.jobId ? { jobId: filter.jobId } : {}),
      ...(filter.stage ? { currentStage: filter.stage } : {}),
      ...(filter.source ? { source: filter.source } : {}),
      email: { not: null },
    },
    select: { name: true, email: true, job: { select: { title: true, client: { select: { name: true } } } } },
  })
  return candidates
    .filter((c): c is typeof c & { email: string } => !!c.email)
    .map((c) => ({ name: c.name, email: c.email, job: c.job?.title, company: c.job?.client?.name }))
}

export function personalize(text: string, r: Recipient): string {
  return text
    .replace(/\{\{name\}\}/g, r.name || 'there')
    .replace(/\{\{job\}\}/g, r.job || 'the role')
    .replace(/\{\{company\}\}/g, r.company || 'our client')
}
