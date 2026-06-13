import { Container } from './ui'
import { T } from './tokens'

// NOTE FOR FOUNDER: these are plain-language templates. Have counsel review
// before relying on them for compliance in your operating jurisdictions.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section style={{ paddingTop: 130, paddingBottom: 80 }}><Container style={{ maxWidth: 800 }}>
      <h1 className="mk-h2" style={{ marginBottom: 6 }}>{title}</h1>
      <div style={{ fontSize: 13.5, color: '#94A3B8', marginBottom: 32 }}>Last updated: {updated}</div>
      <div style={{ fontSize: 15.5, color: '#334155', lineHeight: 1.75 }}>{children}</div>
    </Container></section>
  )
}
export function H({ children }: { children: React.ReactNode }) { return <h2 style={{ fontSize: 20, fontWeight: 800, color: T.ink, margin: '28px 0 10px' }}>{children}</h2> }
export function P({ children }: { children: React.ReactNode }) { return <p style={{ margin: '0 0 14px' }}>{children}</p> }
export function UL({ items }: { items: string[] }) { return <ul style={{ margin: '0 0 14px', paddingLeft: 20 }}>{items.map((i, k) => <li key={k} style={{ marginBottom: 6 }}>{i}</li>)}</ul> }
