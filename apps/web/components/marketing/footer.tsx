import Link from 'next/link'
import { CONTACT_EMAIL, FOOTER, LEGAL_ENTITY, TRY_LIVE } from '@/config/site'
import { ContactHelpdesk } from '@/components/ui/ContactHelpdesk'
import { ThemedLogo } from './themed-logo'

// Exported name kept: app/hire/page.tsx imports MarketingFooter.
export function MarketingFooter() {
  return (
    <footer className="border-t border-mk-line bg-mk-bg text-mk-slate">
      <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(5,1fr)] lg:gap-8">
          <div className="max-w-xs">
            <ThemedLogo height={22} />
            <p className="mt-4 text-[0.9rem] leading-relaxed text-mk-muted">Technical hiring with evidence, not guesses — starting with AI technical interviews.</p>
            <p className="mt-5 flex items-start gap-2 text-[0.82rem] leading-relaxed text-mk-muted">
              <span aria-hidden className="mk-dot mt-[0.45rem]" />
              Early access — we’re onboarding a small number of teams.
            </p>
            <div className="mt-6"><Link href={TRY_LIVE.href} className="mk-btn mk-btn-primary !px-3.5 !py-2 !text-[0.86rem]">{TRY_LIVE.label}</Link></div>
          </div>
          <nav aria-label="Footer" className="contents">
            {FOOTER.map((col) => (
              <div key={col.title}>
                <h2 className="text-[0.82rem] font-medium text-mk-ink">{col.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label} className="flex items-center gap-2">
                      <Link href={l.href} className="text-[0.9rem] text-mk-muted transition-colors hover:text-mk-ink">{l.label}</Link>
                      {l.badge && <span className="mk-badge mk-badge-neutral !py-[0.15rem] !text-[0.66rem]">{l.badge}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-mk-line pt-6 text-[0.82rem] text-mk-muted md:flex-row md:items-center">
          <p>© 2026 {LEGAL_ENTITY}. Levl1 is a product of {LEGAL_ENTITY}.</p>
          <div className="flex flex-wrap items-center gap-4 md:ml-auto">
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-mk-ink">{CONTACT_EMAIL}</a>
            <ContactHelpdesk tone="light" style={{ color: 'rgb(var(--mk-slate))', border: '1px solid rgb(var(--mk-line))', background: 'transparent' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
