import { home } from '@/content/home'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid, OutcomeStrip, ProblemGrid, Steps } from '@/components/marketing/sections/grids'
import { Pillars } from '@/components/marketing/sections/pillars'
import { AudienceSplit } from '@/components/marketing/sections/audience'
import { Funnel } from '@/components/marketing/sections/funnel'
import { CTABand } from '@/components/marketing/sections/bands'
import { Container, ProofPlaceholder, TextLink } from '@/components/marketing/sections/primitives'
import { ScreenRoomMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...home.meta, path: '/', og: 'home' })

// Problem → outcome → how → pillars (as proof) → audience → funnel → trust → CTA.
export default function Home() {
  return (
    <>
      <Hero {...home.hero} visual={<ScreenRoomMock />} />
      <ProblemGrid heading={home.problem.heading} items={home.problem.items} />
      <OutcomeStrip heading={home.outcome.heading} items={home.outcome.items} />
      <Steps heading={home.steps.heading} steps={home.steps.items} tone="mist" />
      <Pillars heading={home.pillars.heading} pillars={home.pillars.items} />
      <AudienceSplit heading={home.audience.heading} audiences={home.audience.items} />
      <Funnel heading={home.funnel.heading} details={home.funnel.details} />
      <FeatureGrid heading={home.trust.heading} items={home.trust.items} columns={4} tone="mist" />
      <div className="border-b border-mk-line bg-mk-mist pb-16 text-center"><Container><TextLink cta={home.trust.link} /></Container></div>
      {/* TODO(abhijit): customer proof (logos, testimonials, outcomes) — render nothing until verified. Early-access framing is used instead. */}
      <ProofPlaceholder slot="home" />
      <CTABand {...home.cta} />
    </>
  )
}
