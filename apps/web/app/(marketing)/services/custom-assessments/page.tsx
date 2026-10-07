import { customAssessments } from '@/content/company'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid, Steps } from '@/components/marketing/sections/grids'
import { CTABand } from '@/components/marketing/sections/bands'

export const metadata = pageMetadata({ ...customAssessments.meta, path: '/services/custom-assessments', og: 'customAssessments' })

export default function CustomAssessmentsPage() {
  return (
    <>
      <Hero {...customAssessments.hero} compact />
      <FeatureGrid items={customAssessments.items} columns={4} />
      <Steps heading={customAssessments.steps.heading} steps={customAssessments.steps.items} tone="mist" />
      <CTABand {...customAssessments.cta} />
    </>
  )
}
