import Link from 'next/link'
import { H } from '@/components/ui/hire-tokens'
import { PageHeader, Card } from '@/components/ui/hire-kit'
import { AuditSettingsCard } from '@/components/hire/audit-settings-card'

export default function HireSettings() {
  const items: [string, string, string][] = [
    ['Billing & plan', 'Manage your plan, usage and invoices.', '/hire/settings/billing'],
    ['Job Boards', 'Connect LinkedIn, Indeed, Naukri & more for one-click posting.', '/hire/settings/job-boards'],
    ['Integrations · Job Boards', 'Connect your own Naukri / Indeed accounts (LinkedIn via extension) — your credits, your subscription, plus AI.', '/hire/settings/integrations'],
    ['Email Templates', 'Reusable templates with {{name}}, {{job}}, {{company}} tokens for 1:1 outreach.', '/hire/settings/email-templates'],
    ['Email / Mailbox', 'Connect your business mailbox (IMAP/SMTP) to pull job-spec emails & send from your own address.', '/hire/settings/mailbox'],
    ['Career Page', 'A branded public page listing your open roles, on your logo & colour.', '/hire/settings/career-page'],
    ['Developers / API', 'API keys, outbound webhooks & the MCP server for integrations.', '/hire/settings/developers'],
  ]
  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title="Settings" subtitle="Manage billing, integrations and developer access." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="set-grid">
        {items.map(([title, desc, href]) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <Card style={{ transition: 'border-color .15s ease' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: H.primary, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: H.faint }}>{desc}</div>
            </Card>
          </Link>
        ))}
        <AuditSettingsCard />
      </div>
      <style>{`@media (max-width:640px){ .set-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  )
}
