import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

// GET — current career-page config + the tenant's ACTIVE jobs with their
// "show on career page" flag (so the builder can pick which appear).
export const GET = withHireAuth(async (_req, ctx) => {
  const tenant = await prisma.hireTenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true, logoUrl: true, careerSlug: true, careerEnabled: true, brandColor: true, careerTagline: true, careerDescription: true },
  })
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, location: true, department: true, showOnCareers: true },
  })
  return NextResponse.json({
    config: {
      companyName: tenant?.name ?? '',
      logoUrl: tenant?.logoUrl ?? '',
      careerSlug: tenant?.careerSlug ?? '',
      suggestedSlug: slugify(tenant?.name ?? 'company'),
      careerEnabled: tenant?.careerEnabled ?? false,
      brandColor: tenant?.brandColor ?? '#6D28D9',
      careerTagline: tenant?.careerTagline ?? '',
      careerDescription: tenant?.careerDescription ?? '',
    },
    jobs,
  })
})

// PATCH — save config + which jobs appear.
export const PATCH = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.careerSlug === 'string') {
    const slug = slugify(body.careerSlug)
    if (!slug) return NextResponse.json({ error: 'Enter a valid URL slug (letters, numbers, hyphens).' }, { status: 400 })
    // Enforce uniqueness across tenants.
    const clash = await prisma.hireTenant.findFirst({ where: { careerSlug: slug, NOT: { id: ctx.tenantId } }, select: { id: true } })
    if (clash) return NextResponse.json({ error: 'That career-page URL is already taken — pick another.' }, { status: 409 })
    data.careerSlug = slug
  }
  if (typeof body.careerEnabled === 'boolean') data.careerEnabled = body.careerEnabled
  if (typeof body.brandColor === 'string') data.brandColor = /^#[0-9a-fA-F]{6}$/.test(body.brandColor) ? body.brandColor : '#6D28D9'
  if ('logoUrl' in body) data.logoUrl = body.logoUrl ? String(body.logoUrl) : null
  if ('careerTagline' in body) data.careerTagline = body.careerTagline ? String(body.careerTagline).slice(0, 160) : null
  if ('careerDescription' in body) data.careerDescription = body.careerDescription ? String(body.careerDescription).slice(0, 2000) : null

  // Enabling the page requires a slug.
  if (data.careerEnabled === true && !data.careerSlug) {
    const existing = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { careerSlug: true } })
    if (!existing?.careerSlug) return NextResponse.json({ error: 'Set a career-page URL before publishing.' }, { status: 400 })
  }

  if (Object.keys(data).length) await prisma.hireTenant.update({ where: { id: ctx.tenantId }, data })

  // Job selection: jobIds[] = the ACTIVE jobs to show.
  if (Array.isArray(body.jobIds)) {
    const ids = body.jobIds.filter((x: unknown) => typeof x === 'string') as string[]
    const active = await prisma.hireJob.findMany({ where: { tenantId: ctx.tenantId, status: 'ACTIVE' }, select: { id: true } })
    const activeIds = new Set(active.map((j) => j.id))
    const show = ids.filter((id) => activeIds.has(id))
    await prisma.hireJob.updateMany({ where: { tenantId: ctx.tenantId, id: { in: show } }, data: { showOnCareers: true } })
    await prisma.hireJob.updateMany({ where: { tenantId: ctx.tenantId, id: { notIn: show.length ? show : ['__none__'] } }, data: { showOnCareers: false } })
  }

  return NextResponse.json({ ok: true })
})
