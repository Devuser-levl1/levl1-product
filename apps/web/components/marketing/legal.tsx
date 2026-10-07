import { Container } from './sections/primitives'

// NOTE FOR FOUNDER: these are plain-language templates. Have counsel review
// before relying on them for compliance in your operating jurisdictions.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section className="relative bg-gradient-to-b from-[#F6F4FF] via-white to-white pb-24 pt-32 sm:pt-40">
      <Container className="max-w-[820px]">
        <p className="mk-eyebrow mb-4 text-mk-purple">Legal</p>
        <h1 className="mk-h2">{title}</h1>
        <p className="mt-3 text-[0.9rem] text-mk-muted">Last updated: {updated}</p>
        <div className="mt-10 text-[1.02rem] leading-[1.8] text-slate-700">{children}</div>
      </Container>
    </section>
  )
}
export function H({ children }: { children: React.ReactNode }) { return <h2 className="mb-3 mt-10 text-xl font-extrabold tracking-tight text-mk-ink">{children}</h2> }
export function P({ children }: { children: React.ReactNode }) { return <p className="mb-4">{children}</p> }
export function UL({ items }: { items: string[] }) { return <ul className="mb-4 list-disc space-y-1.5 pl-5">{items.map((i, k) => <li key={k}>{i}</li>)}</ul> }
