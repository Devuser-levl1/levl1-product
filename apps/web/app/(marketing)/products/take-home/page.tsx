import { solve } from '@/content/solve'
import { home } from '@/content/home'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { TrustRow } from '@/components/marketing/sections/trust-row'
import { SplitFeature } from '@/components/marketing/sections/split-feature'
import { Steps } from '@/components/marketing/sections/grids'
import { Funnel } from '@/components/marketing/sections/funnel'
import { CTABand } from '@/components/marketing/sections/bands'
import { SolveWorkspaceMock } from '@/components/marketing/mocks/solve'

// Solve (Stage 2) is LIVE — the slug stays /products/take-home (/products/solve redirects here).
export const metadata = pageMetadata({ ...solve.meta, path: '/products/take-home', og: 'takeHome' })

export default function SolvePage() {
  return (
    <>
      <Hero {...solve.hero} visual={<SolveWorkspaceMock />} />
      <TrustRow heading={solve.how.heading} items={solve.how.items} columns={3} tone="mist" />
      <SplitFeature block={solve.work} />
      <TrustRow heading={solve.ai.heading} items={solve.ai.items} columns={3} tone="mist" />
      <SplitFeature block={solve.report} reverse />
      <Steps heading={{ eyebrow: 'Getting started', title: 'Three steps from a position to a decision.' }} steps={solve.steps} tone="mist" />
      <Funnel heading={{ eyebrow: 'Where it fits', title: 'Stage two of three.' }} current="takeHome" details={home.funnel.details} />
      <CTABand {...solve.cta} />
    </>
  )
}
