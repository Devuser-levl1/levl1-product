import Link from 'next/link'
import { T } from './tokens'

export function MarketingFooter() {
  const col = (title: string, links: [string, string][]) => (
    <div><div style={{ fontSize: 12, fontWeight: 700, color: '#A9B0D6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{title}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{links.map(([l, h]) => <Link key={l} href={h} className="mk-footlink" style={{ fontSize: 13.5, color: "#C7CCEA", textDecoration: "none" }}>{l}</Link>)}</div></div>
  )
  return (
    <footer style={{ background: T.ink, color: '#C7CCEA' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 24px 36px' }}>
        <div className="mk-foot" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 36 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}><span style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`, transform: 'rotate(45deg)' }} /><span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>Levl1</span></div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 260, color: '#A9B0D6' }}>The AI hiring &amp; evaluation platform for modern talent teams worldwide.</div>
          </div>
          {col('Products', [['Hire', '/hire'], ['Interviews', '/interviews']])}
          {col('Company', [['Roadmap', '/roadmap'], ['Contact', '/contact'], ['Security', '/security']])}
          {col('Legal', [['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies']])}
          <div><div style={{ fontSize: 12, fontWeight: 700, color: '#A9B0D6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Get started</div><Link href="/contact" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: `linear-gradient(120deg, ${T.purple}, ${T.blue})`, padding: '10px 18px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>Book a demo</Link></div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12.5, color: '#7C83A8' }}>hello@levl1.io · © 2026 Levl1. All rights reserved.</div>
      </div>
    </footer>
  )
}
