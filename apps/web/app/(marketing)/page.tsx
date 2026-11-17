import { home } from '@/content/home'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { Comparison } from '@/components/marketing/sections/comparison'
import { InterviewTimeline } from '@/components/marketing/sections/timeline'
import { Pillars } from '@/components/marketing/sections/pillars'
import { TabSection } from '@/components/marketing/sections/tab-sections'
import { Funnel } from '@/components/marketing/sections/funnel'
import { TrustRow } from '@/components/marketing/sections/trust-row'
import { CTABand } from '@/components/marketing/sections/bands'
import { ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { ScreenRoomMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...home.meta, path: '/', og: 'home' })

// Hero → today vs with Screen → one interview, minute by minute → proof →
// audience tabs → funnel → trust → CTA. (DESIGN.md)
export default function Home() {
  return (
    <>
      {/* TODO(abhijit): replace the recreated room with a short silent screen recording of a real interview. */}
      <Hero {...home.hero} visual={<ScreenRoomMock />} />
      <Comparison heading={home.comparison.heading} rows={home.comparison.rows} withLabel={home.comparison.withLabel} />
      <InterviewTimeline heading={home.timeline.heading} steps={home.timeline.steps} caption={home.timeline.caption} />
      <Pillars heading={home.pillars.heading} pillars={home.pillars.items} />
      <TabSection heading={home.audience.heading} items={home.audience.items} label="Who it’s for" tone="mist" />
      <Funnel heading={home.funnel.heading} details={home.funnel.details} />
      <TrustRow heading={home.trust.heading} items={home.trust.items} link={home.trust.link} />
      {/* TODO(abhijit): customer proof (logos, testimonials, outcomes) — render nothing until verified. */}
      <ProofPlaceholder slot="home" />
      <CTABand {...home.cta} />
    </>
  )
}
