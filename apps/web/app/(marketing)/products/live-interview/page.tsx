import { PRODUCTS } from '@/config/site'
import { interview } from '@/content/interview'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { ProblemGrid } from '@/components/marketing/sections/grids'
import { Phases } from '@/components/marketing/sections/phases'
import { FeatureGroups } from '@/components/marketing/sections/feature-groups'
import { TabSection } from '@/components/marketing/sections/tab-sections'
import { Funnel } from '@/components/marketing/sections/funnel'
import { TrustRow } from '@/components/marketing/sections/trust-row'
import { Container, Section, SectionHeading, TextLink } from '@/components/marketing/sections/primitives'
import { EarlyAccessForm } from '@/components/marketing/early-access-form'
import { InterviewCopilotMock } from '@/components/marketing/mocks/interview'

// Interview — Stage 3, COMING SOON. A full product page in early-access
// framing: copy in content/interview.ts (future tense, honest claims), product
// names from config/site.ts. The slug stays /products/live-interview.
export const metadata = pageMetadata({ ...interview.meta, path: '/products/live-interview', og: 'liveInterview' })

export default function InterviewPage() {
  const name = PRODUCTS.liveInterview.name
  return (
    <>
      <Hero badge={interview.hero.badge} title={interview.hero.title} lead={interview.hero.lead}
        secondary={interview.hero.secondary} microcopy={interview.hero.microcopy}
        capture={<EarlyAccessForm productName={name} compact />}
        visual={<InterviewCopilotMock />} visualCaption={interview.previewNote} />
      <ProblemGrid heading={interview.problem.heading} items={interview.problem.items} />
      <Phases heading={interview.how.heading} phases={interview.how.phases} />
      <FeatureGroups heading={interview.features.heading} groups={interview.features.groups} tone="mist" />
      <TabSection heading={interview.audience.heading} items={interview.audience.items} label={`Who ${name} is for`} />
      <Funnel heading={interview.funnel.heading} current="liveInterview" details={interview.funnel.details} />
      <TrustRow heading={interview.trust.heading} items={interview.trust.items} link={interview.trust.link} tone="mist" />
      <Section id="early-access">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <SectionHeading {...interview.earlyAccess.heading} />
              <p data-reveal className="mt-6 border-l-2 border-mk-line pl-4 text-[0.95rem] leading-relaxed text-mk-muted">{interview.earlyAccess.note}</p>
              <div data-reveal className="mt-6"><TextLink cta={interview.earlyAccess.talk} /></div>
            </div>
            <div data-reveal="scale"><EarlyAccessForm productName={name} /></div>
          </div>
        </Container>
      </Section>
    </>
  )
}
