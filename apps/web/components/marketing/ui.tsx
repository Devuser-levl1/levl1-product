import Link from 'next/link'

export const ACCENTS = {
  hire: '#7C3AED',
  interviews: '#4F46E5',
  upword: '#0891B2',
}

export function CTA({ href, children, variant = 'primary', accent = '#4F46E5' }: { href: string; children: React.ReactNode; variant?: 'primary' | 'ghost'; accent?: string }) {
  const base: React.CSSProperties = { display: 'inline-block', fontSize: 15, fontWeight: 700, padding: '13px 22px', borderRadius: 10, textDecoration: 'none' }
  const style = variant === 'primary'
    ? { ...base, background: accent, color: '#fff', boxShadow: `0 6px 20px ${accent}30` }
    : { ...base, background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }
  return <Link href={href} style={style}>{children}</Link>
}

export function Eyebrow({ children, accent = '#4F46E5' }: { children: React.ReactNode; accent?: string }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, marginBottom: 14 }}>{children}</div>
}

export function FeatureRow({ index, title, body, accent, mock }: { index: number; title: string; body: string; accent: string; mock: React.ReactNode }) {
  const reversed = index % 2 === 1
  return (
    <div className="mkt-feature" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', padding: '36px 0' }}>
      <div style={{ order: reversed ? 2 : 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginBottom: 8 }}>{String(index + 1).padStart(2, '0')}</div>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>{title}</h3>
        <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>
      <div style={{ order: reversed ? 1 : 2, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mock}</div>
    </div>
  )
}
