import { security } from '@/content/company'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid } from '@/components/marketing/sections/grids'
import { Container, Section, SectionHeading } from '@/components/marketing/sections/primitives'

export const metadata = pageMetadata({ ...security.meta, path: '/security', og: 'security' })

export default function SecurityPage() {
  return (
    <>
      <Hero {...security.hero} compact />
      <FeatureGrid items={security.facts} columns={4} />
      {/* TODO(abhijit): model-training statement and data residency — add only once confirmed. */}
      <Section tone="mist">
        <Container>
          <SectionHeading eyebrow="Subprocessors" title="Who processes data for us." lead="These services power Levl1 under contract." />
          <div data-reveal className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-xl border border-mk-line bg-mk-surface">
            <table className="w-full text-left text-[0.95rem]">
              <caption className="sr-only">Levl1 subprocessors and their purpose</caption>
              <thead className="border-b border-mk-line text-[0.8rem] text-mk-muted">
                <tr><th scope="col" className="px-6 py-3 font-medium">Service</th><th scope="col" className="px-6 py-3 font-medium">Purpose</th></tr>
              </thead>
              <tbody className="divide-y divide-mk-line">
                {security.subprocessors.map(([name, purpose]) => (
                  <tr key={name}><th scope="row" className="px-6 py-4 font-medium text-mk-ink">{name}</th><td className="px-6 py-4 text-mk-slate">{purpose}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p data-reveal className="mt-10 text-center text-mk-slate">{security.contact}</p>
        </Container>
      </Section>
    </>
  )
}
