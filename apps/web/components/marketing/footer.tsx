import Link from 'next/link'

export function MarketingFooter() {
  return (
    <footer style={{ background: '#0F172A', color: '#94A3B8', marginTop: 80 }}>
      <div className="mkt-container" style={{ padding: '48px 20px 32px' }}>
        <div className="mkt-grid-foot" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>Levl1</div>
            <div style={{ fontSize: 13, marginTop: 8, maxWidth: 220 }}>The AI-native talent platform.</div>
          </div>
          <FootCol title="Products" links={[['Hire', '/hire'], ['Interviews', '/interviews'], ['Upword', '/upword']]} />
          <FootCol title="Company" links={[['Roadmap', '/roadmap'], ['Pricing', '/pricing'], ['Contact', 'mailto:hello@levl1.io']]} />
          <FootCol title="Legal" links={[['Privacy', '/pricing'], ['Terms', '/pricing'], ['hello@levl1.io', 'mailto:hello@levl1.io']]} />
        </div>
        <div style={{ marginTop: 36, fontSize: 12, color: '#64748B' }}>levl1.io · © 2026 Levl1</div>
      </div>
    </footer>
  )
}

function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(([label, href]) => <Link key={label} href={href} style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>{label}</Link>)}
      </div>
    </div>
  )
}
