import Link from 'next/link'
import type { CTA } from '@/content/types'
import { ButtonLink, Container, TextLink } from './primitives'
import { Badge } from './badge'

export interface Evidence { time: string; text: string; tone?: 'pass' | 'flag' | 'neutral' }

/** One line of product truth: mono timestamp + text (DESIGN.md "evidence snippet"). */
export function EvidenceSnippet({ e, className = '' }: { e: Evidence; className?: string }) {
  const tone = e.tone === 'pass' ? 'mk-evidence-pass' : e.tone === 'flag' ? 'mk-evidence-flag' : ''
  return <span className={`mk-evidence ${tone} ${className}`}><time>{e.time}</time>{e.text}</span>
}

// Page hero. With a `visual` it splits text | product panel (two columns from
// tablet width up); without, it is a left-aligned text hero.
export function Hero({ eyebrow, badge, badgeTone = 'neutral', title, lead, primary, secondary, points, visual, compact = false,
  display = false, chips, chipsLabel, microcopy, evidence }: {
  eyebrow?: string; badge?: string; badgeTone?: 'neutral' | 'live'; title: string; highlight?: string; lead?: string
  primary?: CTA; secondary?: CTA; points?: string[]; visual?: React.ReactNode; compact?: boolean
  /** Use the largest display size (Home only). */
  display?: boolean
  /** Interactive entry points under the headline (e.g. "try as Backend"). */
  chips?: CTA[]; chipsLabel?: string
  /** Small reassurance line under the actions. */
  microcopy?: string
  /** Evidence snippets floated on the product panel. */
  evidence?: Evidence[]
}) {
  const h = display ? 'mk-display' : compact ? 'mk-h2' : 'mk-h1'
  return (
    <section className={`relative bg-mk-bg ${compact ? 'pb-14 pt-32 sm:pb-20 sm:pt-40' : 'pb-16 pt-28 sm:pb-24 sm:pt-36'}`}>
      <Container>
        <div className={visual ? 'grid items-center gap-10 md:grid-cols-[1fr_1.05fr] lg:gap-16' : 'max-w-4xl'}>
          <div>
            {badge && <div className="mk-intro mb-6"><Badge tone={badgeTone}>{badge}</Badge></div>}
            {eyebrow && <p className="mk-eyebrow mk-intro mb-4">{eyebrow}</p>}
            <h1 className={`${h} mk-intro-title`}>{title}</h1>
            {lead && <p className="mk-lead mk-intro mt-6 max-w-[34rem]" style={{ ['--d' as string]: '100ms' }}>{lead}</p>}

            {chips && chips.length > 0 && (
              <div className="mk-intro mt-8" style={{ ['--d' as string]: '160ms' }}>
                {chipsLabel && <p className="mb-3 text-[0.9rem] font-medium text-mk-ink">{chipsLabel}</p>}
                <ul className="flex flex-wrap gap-2">
                  {chips.map((c) => <li key={c.href}><Link href={c.href} className="mk-chip">{c.label}</Link></li>)}
                </ul>
              </div>
            )}

            {(primary || secondary) && (
              <div className={`mk-intro flex flex-wrap items-center gap-x-5 gap-y-3 ${chips ? 'mt-6' : 'mt-9'}`} style={{ ['--d' as string]: '200ms' }}>
                {primary && <ButtonLink cta={primary} />}
                {secondary && (chips ? <TextLink cta={secondary} /> : <ButtonLink cta={secondary} variant="secondary" />)}
              </div>
            )}
            {microcopy && <p className="mk-intro mt-4 text-[0.88rem] text-mk-muted" style={{ ['--d' as string]: '240ms' }}>{microcopy}</p>}

            {points && points.length > 0 && (
              <ul className="mk-intro mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.92rem] text-mk-slate" style={{ ['--d' as string]: '260ms' }}>
                {points.map((p) => <li key={p} className="flex items-center gap-2"><span aria-hidden className="h-1 w-1 rounded-full bg-mk-muted" />{p}</li>)}
              </ul>
            )}
          </div>

          {visual && (
            <div className="mk-intro" style={{ ['--d' as string]: '200ms' }}>
              <div className="mk-panel mk-panel-xl">
                <div className="mk-float rounded-xl">{visual}</div>
                {evidence && evidence.length > 0 && (
                  <>
                    {/* Floating on wide screens… */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
                      {evidence.slice(0, 2).map((e, i) => (
                        <EvidenceSnippet key={e.time} e={e} className={`mk-float absolute ${i === 0 ? '-left-7 top-[62%]' : '-right-4 bottom-8'}`} />
                      ))}
                    </div>
                    {/* …stacked under the panel content on smaller screens. */}
                    <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
                      {evidence.slice(0, 2).map((e) => <EvidenceSnippet key={e.time} e={e} />)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
