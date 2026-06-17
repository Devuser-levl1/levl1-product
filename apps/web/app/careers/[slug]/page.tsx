import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Readable text color for a given hex background (so accent buttons stay legible).
function contrastText(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#0F172A' : '#ffffff'
}
const lakh = (n: number) => `₹${(n / 100000).toFixed(0)}L`

export default async function CareerPage({ params }: { params: { slug: string } }) {
  const tenant = await prisma.hireTenant.findUnique({
    where: { careerSlug: params.slug },
    select: { name: true, logoUrl: true, careerEnabled: true, brandColor: true, careerTagline: true, careerDescription: true },
  })
  if (!tenant || !tenant.careerEnabled) notFound()

  const jobs = await prisma.hireJob.findMany({
    where: { tenant: { careerSlug: params.slug }, status: 'ACTIVE', showOnCareers: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, location: true, department: true, salaryMin: true, salaryMax: true, applySlug: true },
  })

  const brand = tenant.brandColor && /^#[0-9a-fA-F]{6}$/.test(tenant.brandColor) ? tenant.brandColor : '#6D28D9'
  const onBrand = contrastText(brand)

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A' }}>
      {/* Branded header */}
      <header style={{ background: brand, color: onBrand, padding: '0' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            {tenant.logoUrl
              ? <img src={tenant.logoUrl} alt={tenant.name} style={{ height: 44, width: 'auto', maxWidth: 180, borderRadius: 8, background: '#fff', padding: 4, objectFit: 'contain' }} />
              : <div style={{ height: 44, minWidth: 44, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 10, background: 'rgba(255,255,255,0.18)', fontWeight: 800, fontSize: 18 }}>{tenant.name}</div>}
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{tenant.careerTagline || `Careers at ${tenant.name}`}</h1>
          {tenant.careerDescription && <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, opacity: 0.92, maxWidth: 620 }}>{tenant.careerDescription}</p>}
        </div>
      </header>

      {/* Jobs */}
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px 60px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          {jobs.length > 0 ? `${jobs.length} open ${jobs.length === 1 ? 'role' : 'roles'}` : 'Open roles'}
        </div>

        {jobs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>No open roles right now</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Check back soon — new opportunities are posted here.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {jobs.map((j) => (
              <a key={j.id} href={`/hire/apply/${j.applySlug}`} style={{ display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>{j.title}</div>
                <div style={{ fontSize: 13, color: '#64748B', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {j.department && <span>{j.department}</span>}
                  {j.location && <span>· {j.location}</span>}
                </div>
                {(j.salaryMin || j.salaryMax) && <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>{j.salaryMin ? lakh(j.salaryMin) : '–'} – {j.salaryMax ? lakh(j.salaryMax) : '–'}</div>}
                <span style={{ marginTop: 16, alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8, background: brand, color: onBrand, fontWeight: 700, fontSize: 13.5 }}>Apply →</span>
              </a>
            ))}
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '24px', fontSize: 12, color: '#94A3B8' }}>
        Powered by <a href="https://levl1.io" style={{ color: '#94A3B8' }}>Levl1 Hire</a>
      </footer>
    </div>
  )
}
