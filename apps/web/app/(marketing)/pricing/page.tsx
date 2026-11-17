import { pricingPage } from '@/content/company'
import { PRICING } from '@/config/pricing'
import { TALK_TO_US, TRY_LIVE } from '@/config/site'
import { pageMetadata } from '@/lib/marketing/metadata'
import { PricingTable } from '@/components/marketing/sections/pricing-table'
import { FAQ, CTABand } from '@/components/marketing/sections/bands'
import { Container, SectionHeading } from '@/components/marketing/sections/primitives'

export const metadata = pageMetadata({ ...pricingPage.meta, path: '/pricing', og: 'pricing' })

// Screen only — the hidden HirePilot plans stay in config/pricing.ts but aren't shown.
const SCREEN_PRICING = PRICING.filter((p) => p.id === 'screen')

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-mk-bg pb-20 pt-32 sm:pb-28 sm:pt-40">
        <div aria-hidden className="mk-glow" />
        <Container className="relative">
          <SectionHeading {...pricingPage.heading} as="h1" />
          <div className="mt-12"><PricingTable products={SCREEN_PRICING} /></div>
        </Container>
      </section>
      <FAQ heading={{ eyebrow: 'FAQ', title: 'Questions, answered.' }} items={pricingPage.faq} tone="mist" />
      <CTABand title="Let’s find the right plan." primary={TALK_TO_US} secondary={TRY_LIVE} />
    </>
  )
}
