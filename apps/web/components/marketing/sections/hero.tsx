import { Check } from 'lucide-react'
import type { CTA } from '@/content/types'
import { ButtonLink, Container, Highlighted } from './primitives'
import { Badge } from './badge'

// Page hero. With a `visual` it splits text | product UI; without, it centres.
export function Hero({ eyebrow, badge, badgeTone = 'neutral', title, highlight, lead, primary, secondary, points, visual, compact = false }: {
  eyebrow?: string; badge?: string; badgeTone?: 'neutral' | 'live'; title: string; highlight?: string; lead?: string
  primary?: CTA; secondary?: CTA; points?: string[]; visual?: React.ReactNode; compact?: boolean
}) {
  const centred = !visual
  return (
    <section className={`relative overflow-hidden bg-mk-bg ${compact ? 'pb-14 pt-32 sm:pb-20 sm:pt-40' : 'pb-20 pt-32 sm:pb-28 sm:pt-40'}`}>
      <div aria-hidden className="mk-glow" />
      <Container className="relative">
        <div className={centred ? 'mx-auto max-w-4xl text-center' : 'grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14'}>
          <div>
            {badge && <div className="mk-intro mb-6"><Badge tone={badgeTone}>{badge}</Badge></div>}
            {eyebrow && <p className="mk-eyebrow mk-intro mb-4">{eyebrow}</p>}
            <h1 className={`${compact ? 'mk-h2' : 'mk-h1'} mk-intro-title`}><Highlighted title={title} highlight={highlight} /></h1>
            {lead && <p className={`mk-lead mk-intro mt-6 max-w-2xl ${centred ? 'mx-auto' : ''}`} style={{ ['--d' as string]: '100ms' }}>{lead}</p>}
            {(primary || secondary) && (
              <div className={`mk-intro mt-9 flex flex-wrap gap-3 ${centred ? 'justify-center' : ''}`} style={{ ['--d' as string]: '180ms' }}>
                {primary && <ButtonLink cta={primary} />}
                {secondary && <ButtonLink cta={secondary} variant="secondary" />}
              </div>
            )}
            {points && points.length > 0 && (
              <ul className={`mk-intro mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[0.92rem] text-mk-slate ${centred ? 'justify-center' : ''}`} style={{ ['--d' as string]: '260ms' }}>
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2"><Check aria-hidden className="h-4 w-4 text-mk-muted" strokeWidth={2.2} />{p}</li>
                ))}
              </ul>
            )}
          </div>
          {visual && <div className="mk-intro relative" style={{ ['--d' as string]: '220ms' }}>{visual}</div>}
        </div>
      </Container>
    </section>
  )
}
