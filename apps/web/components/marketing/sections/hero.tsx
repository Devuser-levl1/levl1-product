import { Check } from 'lucide-react'
import type { CTA } from '@/content/types'
import { GradientMesh } from '../motion/gradient-mesh'
import { ButtonLink, Container, Highlighted } from './primitives'

// Page hero. With a `visual` it splits text | product UI; without, it centres.
export function Hero({ eyebrow, title, highlight, lead, primary, secondary, points, visual, compact = false }: {
  eyebrow?: string; title: string; highlight?: string; lead?: string
  primary?: CTA; secondary?: CTA; points?: string[]; visual?: React.ReactNode; compact?: boolean
}) {
  const centred = !visual
  return (
    <section className={`relative overflow-hidden bg-gradient-to-b from-[#F6F4FF] via-white to-white ${compact ? 'pb-14 pt-32 sm:pb-20 sm:pt-40' : 'pb-20 pt-32 sm:pb-28 sm:pt-44'}`}>
      <GradientMesh animate />
      <div aria-hidden className="mk-grid-bg absolute inset-0" />
      <Container className="relative">
        <div className={centred ? 'mx-auto max-w-4xl text-center' : 'grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12'}>
          <div>
            {eyebrow && <p className="mk-eyebrow mk-intro mb-5 text-mk-purple">{eyebrow}</p>}
            <h1 className={`${compact ? 'mk-h2' : 'mk-h1'} mk-intro-title`}><Highlighted title={title} highlight={highlight} /></h1>
            {lead && <p className={`mk-lead mk-intro mt-6 max-w-2xl ${centred ? 'mx-auto' : ''}`} style={{ ['--d' as string]: '120ms' }}>{lead}</p>}
            {(primary || secondary) && (
              <div className={`mk-intro mt-9 flex flex-wrap gap-3 ${centred ? 'justify-center' : ''}`} style={{ ['--d' as string]: '220ms' }}>
                {primary && <ButtonLink cta={primary} />}
                {secondary && <ButtonLink cta={secondary} variant="secondary" />}
              </div>
            )}
            {points && points.length > 0 && (
              <ul className={`mk-intro mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[0.92rem] text-mk-slate ${centred ? 'justify-center' : ''}`} style={{ ['--d' as string]: '320ms' }}>
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2"><Check aria-hidden className="h-4 w-4 text-mk-violet" strokeWidth={2.5} />{p}</li>
                ))}
              </ul>
            )}
          </div>
          {visual && <div className="mk-intro relative" style={{ ['--d' as string]: '260ms' }}>{visual}</div>}
        </div>
      </Container>
    </section>
  )
}
