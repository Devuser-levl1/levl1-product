import { screenDemo } from '@/content/screen'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { StatementBand } from '@/components/marketing/sections/bands'
import { ButtonLink, Container } from '@/components/marketing/sections/primitives'
import { DemoGallery } from '@/components/screen/demo/DemoGallery'

export const metadata = pageMetadata({ ...screenDemo.meta, path: '/products/screen/demo', og: 'screenDemo' })

// The demo gallery (formerly at /interviews). The gallery component itself is
// unchanged: it starts an isDemo interview via /api/demo/start.
export default function ScreenDemoPage() {
  return (
    <>
      <Hero {...screenDemo.hero} compact />
      <section className="relative bg-white pb-24">
        <Container><DemoGallery /></Container>
      </section>
      <StatementBand heading={screenDemo.after.heading} tone="mist"
        aside={<div className="flex flex-wrap gap-3 lg:justify-end"><ButtonLink cta={screenDemo.after.primary} /><ButtonLink cta={screenDemo.after.secondary} variant="secondary" /></div>} />
    </>
  )
}
