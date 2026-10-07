import Link from 'next/link'
import { CONTACT_EMAIL, FOOTER, LEGAL_ENTITY, ROUTES } from '@/config/site'
import { ContactHelpdesk } from '@/components/ui/ContactHelpdesk'
import { Logo } from './logo'

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-mk-ink text-slate-300">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(5,1fr)] lg:gap-8">
          <div className="max-w-xs">
            <Logo variant="white" height={24} />
            <p className="mt-4 text-[0.9rem] leading-relaxed text-slate-400">AI-led technical interviews and an AI-native ATS + CRM, for engineering teams and recruitment agencies.</p>
            <Link href={ROUTES.demo} className="mk-btn mk-btn-primary mt-6 !px-4 !py-2.5 !text-[0.86rem]">Book a demo</Link>
          </div>
          <nav aria-label="Footer" className="contents">
            {FOOTER.map((col) => (
              <div key={col.title}>
                <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">{col.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}><Link href={l.href} className="text-[0.9rem] text-slate-300 transition-colors hover:text-white">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-[0.82rem] text-slate-400 md:flex-row md:items-center">
          <p>© 2026 {LEGAL_ENTITY}. Levl1 is a product of {LEGAL_ENTITY}.</p>
          <div className="flex flex-wrap items-center gap-4 md:ml-auto">
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-white">{CONTACT_EMAIL}</a>
            <ContactHelpdesk tone="dark" />
          </div>
        </div>
      </div>
    </footer>
  )
}
