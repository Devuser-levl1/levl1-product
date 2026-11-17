import { screenDemo } from '@/content/screen'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid, Steps } from '@/components/marketing/sections/grids'
import { StatementBand } from '@/components/marketing/sections/bands'
import { ButtonLink, Container } from '@/components/marketing/sections/primitives'
import { DemoGallery } from '@/components/screen/demo/DemoGallery'

export const metadata = pageMetadata({ ...screenDemo.meta, path: '/products/screen/demo', og: 'screenDemo' })

// The live demo gallery. DemoGallery starts an isDemo interview via /api/demo/start.
export default function ScreenDemoPage() {
  return (
    <>
      <Hero {...screenDemo.hero} compact />
      <section className="relative bg-mk-bg pb-20 sm:pb-24">
        <Container><DemoGallery /></Container>
      </section>
      <Steps heading={screenDemo.expect.heading} steps={screenDemo.expect.items} tone="mist" />
      <FeatureGrid heading={screenDemo.full.heading} items={screenDemo.full.items} columns={4} />
      <StatementBand heading={screenDemo.after.heading} tone="mist"
        aside={<div className="flex flex-wrap gap-3 lg:justify-end"><ButtonLink cta={screenDemo.after.primary} /><ButtonLink cta={screenDemo.after.secondary} variant="secondary" /></div>} />
    </>
  )
}
