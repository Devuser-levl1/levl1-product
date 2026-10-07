import Link from 'next/link'
import { PlayCircle, ArrowRight } from 'lucide-react'
import { demoPage } from '@/content/company'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Container, SectionHeading } from '@/components/marketing/sections/primitives'
import { GradientMesh } from '@/components/marketing/motion/gradient-mesh'
import { DemoForm } from '@/components/marketing/demo-form'
import { CONTACT_EMAIL } from '@/config/site'

export const metadata = pageMetadata({ ...demoPage.meta, path: '/demo', og: 'demo' })

export default function DemoPage() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F6F4FF] via-white to-white pb-24 pt-32 sm:pt-40">
      <GradientMesh animate />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading {...demoPage.heading} align="left" as="h1" />
            <Link href={demoPage.gallery.cta.href} data-reveal className="mk-card-hover group relative mt-10 block overflow-hidden rounded-[1.75rem] border border-white/10 transition-[transform,box-shadow] duration-300 bg-gradient-to-br from-[#1E1B4B] via-[#3B0764] to-[#1E3A8A] p-7 text-white">
              <PlayCircle aria-hidden className="h-9 w-9 text-violet-200" strokeWidth={1.6} />
              <h2 className="mt-4 text-xl font-extrabold tracking-tight">{demoPage.gallery.title}</h2>
              <p className="mt-2 leading-relaxed text-violet-100/80">{demoPage.gallery.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-white">{demoPage.gallery.cta.label}<ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2.2} /></span>
            </Link>
            <p className="mt-8 text-[0.95rem] text-mk-slate">Prefer email? <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-mk-purple hover:text-mk-indigo">{CONTACT_EMAIL}</a></p>
          </div>
          <div data-reveal="scale"><DemoForm /></div>
        </div>
      </Container>
    </section>
  )
}
