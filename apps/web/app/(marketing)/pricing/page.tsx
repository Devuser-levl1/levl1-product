import { pricingPage } from '@/content/company'
import { PRICING } from '@/config/pricing'
import { pageMetadata } from '@/lib/marketing/metadata'
import { PricingTable } from '@/components/marketing/sections/pricing-table'
import { FAQ, CTABand } from '@/components/marketing/sections/bands'
import { Container, SectionHeading } from '@/components/marketing/sections/primitives'
import { GradientMesh } from '@/components/marketing/motion/gradient-mesh'
import { ROUTES } from '@/config/site'

export const metadata = pageMetadata({ ...pricingPage.meta, path: '/pricing', og: 'pricing' })

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F6F4FF] via-white to-white pb-20 pt-32 sm:pb-28 sm:pt-40">
        <GradientMesh animate />
        <Container className="relative">
          <SectionHeading {...pricingPage.heading} as="h1" />
          <div className="mt-12"><PricingTable products={PRICING} /></div>
        </Container>
      </section>
      <FAQ heading={{ eyebrow: 'FAQ', title: 'Questions, answered.' }} items={pricingPage.faq} tone="mist" />
      <CTABand title="Let’s find the right plan." primary={{ label: 'Talk to sales', href: ROUTES.demo }} secondary={{ label: 'Try a demo interview', href: ROUTES.screenDemo }} />
    </>
  )
}
