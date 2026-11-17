import Link from 'next/link'
import { CONTACT_EMAIL, FOOTER, SITE_NAME, TRY_LIVE } from '@/config/site'
import { ContactHelpdesk } from '@/components/ui/ContactHelpdesk'
import { ThemedLogo } from './themed-logo'

// Exported name kept: app/hire/page.tsx imports MarketingFooter.
export function MarketingFooter() {
  return (
    <footer className="border-t border-mk-line bg-mk-sunken text-mk-slate">
      <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-16 sm:px-8 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.3fr_1.25fr_repeat(4,1fr)] lg:gap-8">
          <div className="col-span-2 max-w-xs sm:col-span-3 lg:col-span-1">
            <ThemedLogo height={22} />
            <p className="mt-4 text-[0.9rem] leading-relaxed text-mk-muted">Technical hiring with evidence, not guesses — starting with AI technical interviews.</p>
            <p className="mt-5 flex items-start gap-2 text-[0.82rem] leading-relaxed text-mk-muted">
              <span aria-hidden className="mk-dot mt-[0.45rem]" />
              Early access — we’re onboarding a small number of teams.
            </p>
            <div className="mt-6"><Link href={TRY_LIVE.href} className="mk-btn mk-btn-primary">{TRY_LIVE.label}</Link></div>
          </div>
          <nav aria-label="Footer" className="contents">
            {FOOTER.map((col) => (
              <div key={col.title}>
                <h2 className="mk-eyebrow !text-mk-ink">{col.title}</h2>
                <ul className="mt-3 lg:mt-4 lg:space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label} className="flex items-center gap-2">
                      <Link href={l.href} className={`mk-tap text-[0.92rem] text-mk-muted transition-colors hover:text-mk-ink lg:min-h-0 ${l.badge ? 'whitespace-nowrap' : ''}`}>{l.label}</Link>
                      {l.badge && <span className="mk-badge mk-badge-neutral !py-[0.15rem] !text-[0.66rem]">{l.badge}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-mk-line pt-6 text-[0.82rem] text-mk-muted md:flex-row md:items-center">
          <p>© 2026 {SITE_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 md:ml-auto">
            <a href={`mailto:${CONTACT_EMAIL}`} className="mk-tap transition-colors hover:text-mk-ink">{CONTACT_EMAIL}</a>
            <ContactHelpdesk tone="light" style={{ color: 'rgb(var(--mk-slate))', border: '1px solid rgb(var(--mk-line))', background: 'transparent', minHeight: 44 }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
