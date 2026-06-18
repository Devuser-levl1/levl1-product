import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { getDemoPersona } from '@/lib/screen/demo/personas'

export const dynamic = 'force-dynamic'

// GET — captured demo leads (admin only). ?format=csv downloads a spreadsheet.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const leads = await prisma.demoLead.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 })
  const rows = leads.map((l) => ({
    id: l.id, name: l.name, email: l.email,
    role: getDemoPersona(l.personaSlug)?.title ?? l.personaSlug,
    personaSlug: l.personaSlug, marketingConsent: l.marketingConsent,
    at: l.createdAt.toISOString(),
  }))

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = ['Name', 'Work email', 'Role tried', 'Marketing consent', 'Captured at']
    const body = rows.map((r) => [r.name, r.email, r.role, r.marketingConsent ? 'yes' : 'no', r.at].map(esc).join(','))
    return new NextResponse([header.join(','), ...body].join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="levl1-demo-leads-${new Date().toISOString().slice(0, 10)}.csv"` },
    })
  }
  return NextResponse.json({ leads: rows, total: rows.length })
}
