import { home } from '@/content/home'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { ProblemGrid, Steps } from '@/components/marketing/sections/grids'
import { SplitFeature } from '@/components/marketing/sections/split-feature'
import { ProductCards } from '@/components/marketing/sections/product-cards'
import { CTABand, StatementBand } from '@/components/marketing/sections/bands'
import { ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { ScreenRoomMock, ScreenIntegrityMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...home.meta, path: '/', og: 'home' })

export default function Home() {
  return (
    <>
      <Hero {...home.hero} visual={<ScreenRoomMock />} />
      <ProblemGrid heading={home.problem.heading} items={home.problem.items} />
      <Steps heading={home.steps.heading} steps={home.steps.items} />
      <SplitFeature block={home.report} tone="mist" />
      <ProductCards heading={home.products.heading} products={home.products.items} />
      <StatementBand heading={home.integrity.heading} link={home.integrity.link} tone="light" aside={<ScreenIntegrityMock />} />
      {/* TODO(abhijit): customer proof (logos, testimonials, outcomes) — render nothing until verified. */}
      <ProofPlaceholder slot="home" />
      <CTABand {...home.cta} />
    </>
  )
}
