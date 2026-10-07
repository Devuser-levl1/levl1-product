import { integrity } from '@/content/features'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid } from '@/components/marketing/sections/grids'
import { CTABand } from '@/components/marketing/sections/bands'
import { Container } from '@/components/marketing/sections/primitives'
import { ScreenIntegrityMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...integrity.meta, path: '/features/integrity', og: 'integrity' })

export default function IntegrityPage() {
  return (
    <>
      <Hero {...integrity.hero} visual={<ScreenIntegrityMock />} />
      <FeatureGrid heading={integrity.signals.heading} items={integrity.signals.items} />
      <FeatureGrid heading={integrity.principles.heading} items={integrity.principles.items} columns={4} tone="mist" />
      <section className="bg-white py-16">
        <Container><p data-reveal className="mx-auto max-w-2xl text-center text-[0.95rem] leading-relaxed text-mk-muted">{integrity.honesty}</p></Container>
      </section>
      <CTABand {...integrity.cta} />
    </>
  )
}
