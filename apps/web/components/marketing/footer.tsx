import Link from 'next/link'
import { CONTACT_EMAIL, FOOTER, SITE_NAME } from '@/config/site'
import { ContactHelpdesk } from '@/components/ui/ContactHelpdesk'
import { ThemedLogo } from './themed-logo'

// Compact footer: a slim brand block, then link columns sized to their content
// (no wrapping labels), then a single bottom bar. Links are 44px tap targets
// on phones and tight on desktop.
// Exported name kept: app/hire/page.tsx imports MarketingFooter.
const linkCls = 'inline-flex min-h-[44px] items-center whitespace-nowrap text-[0.9rem] text-mk-muted transition-colors hover:text-mk-ink lg:min-h-0'

export function MarketingFooter() {
  return (
    <footer className="border-t border-mk-line bg-mk-sunken text-mk-slate">
      <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-14 sm:px-8 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,13rem)_1fr] lg:gap-16">
          <div>
            <ThemedLogo height={22} />
            <p className="mt-3 max-w-[15rem] text-[0.9rem] leading-snug text-mk-muted">Technical hiring with evidence, not guesses.</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-mk-line bg-mk-surface px-2.5 py-1 text-[0.75rem] font-medium text-mk-slate">
              <span aria-hidden className="mk-dot" />Early access
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:flex lg:justify-between lg:gap-8">
            {FOOTER.map((col) => (
              <div key={col.title}>
                <h2 className="mk-eyebrow !text-mk-ink">{col.title}</h2>
                <ul className="mt-2 lg:mt-4 lg:space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label} className="flex items-center gap-2">
                      <Link href={l.href} className={linkCls}>{l.label}</Link>
                      {l.badge && <span className="mk-badge mk-badge-neutral !py-[0.15rem] !text-[0.66rem]">{l.badge}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-mk-line pt-6 text-[0.82rem] text-mk-muted sm:flex-row sm:items-center lg:mt-14">
          <p>© 2026 {SITE_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto">
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-[44px] items-center transition-colors hover:text-mk-ink lg:min-h-0">{CONTACT_EMAIL}</a>
            <ContactHelpdesk tone="light" style={{ color: 'rgb(var(--mk-slate))', border: '1px solid rgb(var(--mk-line))', background: 'transparent', minHeight: 44 }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
