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
      <FeatureGrid items={security.facts} />
      {/* TODO(abhijit): encryption at rest, retention policy, model-training statement, data residency — add only once confirmed. */}
      <Section tone="mist">
        <Container>
          <SectionHeading eyebrow="Subprocessors" title="Who processes data for us." lead="These services power Levl1 under contract." />
          <div data-reveal className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-3xl border border-mk-line bg-white">
            <table className="w-full text-left text-[0.95rem]">
              <caption className="sr-only">Levl1 subprocessors and their purpose</caption>
              <thead className="bg-[#FBFBFE] text-[0.75rem] uppercase tracking-[0.12em] text-slate-500">
                <tr><th scope="col" className="px-6 py-3 font-bold">Service</th><th scope="col" className="px-6 py-3 font-bold">Purpose</th></tr>
              </thead>
              <tbody className="divide-y divide-mk-line">
                {security.subprocessors.map(([name, purpose]) => (
                  <tr key={name}><th scope="row" className="px-6 py-4 font-semibold text-mk-ink">{name}</th><td className="px-6 py-4 text-mk-slate">{purpose}</td></tr>
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
