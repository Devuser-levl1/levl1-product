import { screen } from '@/content/screen'
import { home } from '@/content/home'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { TabSection } from '@/components/marketing/sections/tab-sections'
import { TrustRow } from '@/components/marketing/sections/trust-row'
import { SplitFeature } from '@/components/marketing/sections/split-feature'
import { Funnel } from '@/components/marketing/sections/funnel'
import { CTABand, StatementBand } from '@/components/marketing/sections/bands'
import { ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { ScreenRoomMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...screen.meta, path: '/products/screen', og: 'screen' })

// Tabs and connected strips instead of rows of identical cards (DESIGN.md).
export default function ScreenPage() {
  return (
    <>
      {/* TODO(abhijit): replace the recreated room with a short silent screen recording of a real interview. */}
      <Hero {...screen.hero} visual={<ScreenRoomMock />} />
      <TabSection heading={screen.interview.heading} items={screen.interview.tabs} label="Inside the interview" />
      <TrustRow heading={screen.modes.heading} items={screen.modes.items} columns={3} tone="mist" />
      <SplitFeature block={screen.report} />
      <SplitFeature block={screen.candidate} tone="mist" reverse />
      <SplitFeature block={screen.approval} />
      <SplitFeature block={screen.operations} tone="mist" reverse />
      <StatementBand heading={screen.integrity.heading} link={screen.integrity.link} tone="light" />
      <Funnel heading={{ eyebrow: 'What comes next', title: 'Stage one of three.' }} current="screen" details={home.funnel.details} />
      {/* TODO(abhijit): Screen customer proof — render nothing until verified. */}
      <ProofPlaceholder slot="screen" />
      <CTABand {...screen.cta} />
    </>
  )
}
