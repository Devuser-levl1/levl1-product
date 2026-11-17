import Link from 'next/link'
import { PlayCircle, ArrowRight } from 'lucide-react'
import { demoPage } from '@/content/company'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Container, SectionHeading } from '@/components/marketing/sections/primitives'
import { DemoForm } from '@/components/marketing/demo-form'
import { CONTACT_EMAIL } from '@/config/site'

export const metadata = pageMetadata({ ...demoPage.meta, path: '/demo', og: 'demo' })

export default function DemoPage() {
  return (
    <section className="relative overflow-hidden bg-mk-bg pb-24 pt-32 sm:pt-40">
      <div aria-hidden className="mk-glow" />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading {...demoPage.heading} align="left" as="h1" />
            <Link href={demoPage.gallery.cta.href} data-reveal className="mk-card mk-card-hover group mt-10 block p-6">
              <PlayCircle aria-hidden className="h-7 w-7 text-mk-accent-text" strokeWidth={1.6} />
              <h2 className="mt-4 text-lg font-semibold tracking-tight">{demoPage.gallery.title}</h2>
              <p className="mt-2 leading-relaxed text-mk-slate">{demoPage.gallery.body}</p>
              <span className="mk-link mt-5 inline-flex items-center gap-1.5 font-medium text-mk-accent-text">{demoPage.gallery.cta.label}<ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2} /></span>
            </Link>
            <p className="mt-8 text-[0.95rem] text-mk-slate">Prefer email? <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-mk-accent-text hover:underline">{CONTACT_EMAIL}</a></p>
          </div>
          <div data-reveal="scale"><DemoForm /></div>
        </div>
      </Container>
    </section>
  )
}
