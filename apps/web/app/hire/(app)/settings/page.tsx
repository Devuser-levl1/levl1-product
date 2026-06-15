import Link from 'next/link'

const card: React.CSSProperties = { display: 'block', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, textDecoration: 'none' }

export default function HireSettings() {
  const items: [string, string, string][] = [
    ['Billing & plan', 'Manage your plan, usage and invoices.', '/hire/settings/billing'],
    ['Job Boards', 'Connect LinkedIn, Indeed, Naukri & more for one-click posting.', '/hire/settings/job-boards'],
    ['Developers / API', 'API keys & outbound webhooks for integrations.', '/hire/settings/developers'],
  ]
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Settings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {items.map(([title, desc, href]) => (
          <Link key={href} href={href} style={card}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#4F46E5', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
