import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { CTA } from '@/content/types'

export function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>{children}</div>
}

export function Section({ children, className = '', id, tone = 'light', labelledBy }: {
  children: React.ReactNode; className?: string; id?: string; tone?: 'light' | 'mist' | 'dark'; labelledBy?: string
}) {
  const bg = tone === 'dark' ? 'bg-mk-ink text-white' : tone === 'mist' ? 'bg-mk-mist' : 'bg-white'
  return <section id={id} aria-labelledby={labelledBy} className={`relative overflow-hidden py-20 sm:py-28 ${bg} ${className}`}>{children}</section>
}

/** Renders `title`, wrapping the `highlight` substring in the brand gradient. */
export function Highlighted({ title, highlight }: { title: string; highlight?: string }) {
  if (!highlight || !title.includes(highlight)) return <>{title}</>
  const [before, after] = title.split(highlight)
  return <>{before}<span className="mk-grad-text">{highlight}</span>{after}</>
}

export function ButtonLink({ cta, variant = 'primary', className = '' }: { cta: CTA; variant?: 'primary' | 'secondary' | 'onDark' | 'light'; className?: string }) {
  const external = cta.href.startsWith('mailto:') || cta.href.startsWith('http')
  const cls = `mk-btn mk-btn-${variant} ${className}`
  const inner = <>{cta.label}<ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2.2} /></>
  return external ? <a href={cta.href} className={cls}>{inner}</a> : <Link href={cta.href} className={cls}>{inner}</Link>
}

export function TextLink({ cta, dark = false }: { cta: CTA; dark?: boolean }) {
  return (
    <Link href={cta.href} className={`mk-link inline-flex items-center gap-1.5 text-[0.95rem] font-semibold ${dark ? 'text-violet-200 hover:text-white' : 'text-mk-purple hover:text-mk-indigo'}`}>
      {cta.label}<ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2.2} />
    </Link>
  )
}

export function SectionHeading({ eyebrow, title, highlight, lead, align = 'center', dark = false, id, as = 'h2' }: {
  eyebrow?: string; title: string; highlight?: string; lead?: string; align?: 'center' | 'left'; dark?: boolean; id?: string; as?: 'h1' | 'h2'
}) {
  const H = as
  return (
    <div data-reveal className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl`}>
      {eyebrow && <p className={`mk-eyebrow mb-4 ${dark ? 'text-violet-300' : 'text-mk-purple'}`}>{eyebrow}</p>}
      <H id={id} className={as === 'h1' ? 'mk-h1' : 'mk-h2'}><Highlighted title={title} highlight={highlight} /></H>
      {lead && <p className={`mk-lead mt-5 ${dark ? '!text-slate-300' : ''} ${align === 'center' ? 'mx-auto' : ''} max-w-2xl`}>{lead}</p>}
    </div>
  )
}

/** Where customer proof will go. Renders nothing until real, verified proof exists. */
export function ProofPlaceholder(_props: { slot: string }) {
  // TODO(abhijit): add verified customer logos / testimonials / outcomes for this slot. Render nothing until then.
  return null
}
