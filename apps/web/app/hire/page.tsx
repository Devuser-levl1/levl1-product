import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CookieBanner } from '@/components/marketing/cookie-banner'
import { Container, Reveal, Stagger, StaggerItem, Button, Eyebrow, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { KanbanMock, ScorecardMock, DealPipelineMock } from '@/components/marketing/mocks'

export const metadata: Metadata = {
  title: 'Levl1 Hire — AI-native ATS + CRM',
  description: 'Your entire hiring pipeline, intelligent by default. Source, score, match and place candidates faster — with a built-in CRM and AI that does the manual work.',
  openGraph: { title: 'Levl1 Hire — AI-native ATS + CRM', description: 'Your entire hiring pipeline. Intelligent by default.' },
}

const CAPS: [string, string][] = [
  ['AI Job-Brief Generator', 'Type a role and a nudge — “senior .NET, Azure” — and Levl1 writes a deep, role-specific JD: responsibilities, must-haves, nice-to-haves, screening criteria. Tailored, not generic — in seconds.'],
  ['Weighted Screening Rubric', 'Define what matters per role — skills, weights, must-haves vs nice-to-haves. The AI scores every candidate against your rubric, not a black box. Change a weight, re-score instantly.'],
  ['AI Résumé Scoring & Matching', 'Every candidate scored 0–100 the moment they arrive — matched skills, missing skills, and the reasoning. Best-fit candidates ranked per role. Even scanned and image-based résumés are read correctly.'],
  ['“Ask Levl1” — agentic assistant', 'A copilot that acts, not just answers. “Find five candidates for this role and add them to the pipeline.” “Draft outreach to my shortlist.” It proposes; you approve; it executes.'],
  ['Pipeline + CRM in one', 'Drag-and-drop pipelines, reject/audit workflows, a full client & contact CRM, and deal economics that calculate contract value (positions × rate × hours × duration) and link deals to jobs.'],
  ['Team management for managers', 'A manager’s-eye view: who’s working on what, position ageing, workload balance, and drag-and-drop job assignment across the team. Role-based access from recruiter to manager to admin.'],
  ['Sourcing, intelligently', 'AI-generated, board-optimized search strings (Naukri boolean, LinkedIn/Indeed queries) from each job’s rubric — plus connectors to post and source through your own board accounts.'],
  ['Built-in email', 'Connect your business mailbox, read inbound job specs (AI drafts the position for you), and reach out to candidates from your own address — without leaving Levl1.'],
]

const ROI: [string, string][] = [
  ['Cut first-round screening time dramatically', 'AI triages every CV so recruiters skip manual reading.'],
  ['Run more roles per recruiter', 'Automation and ranking multiply each recruiter’s capacity.'],
  ['Faster, defensible shortlists', 'Evidence-backed scoring your clients trust the first time.'],
  ['Live in minutes, not weeks', 'No implementation project, no heavy training. Lean by design.'],
  ['One platform, not five tools', 'ATS, CRM, sourcing, and screening in one, replacing a stack.'],
]

export default function HireMarketing() {
  return (
    <div className="mk-wrap" style={{ background: '#fff' }}>
      <MarketingNav />
      <main>
        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 80, background: 'linear-gradient(180deg,#FAF5FF,#fff)' }}>
          <div className="mk-blob" style={{ width: 420, height: 420, background: '#C4B5FD', top: -120, right: -80 }} />
          <Container style={{ position: 'relative' }}>
            <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
              <div>
                <Reveal><Eyebrow color={T.violet}>Levl1 Hire · AI-native ATS + CRM</Eyebrow></Reveal>
                <Reveal delay={0.1}><h1 className="mk-h1">Your entire hiring pipeline. <GradientText>Intelligent by default.</GradientText></h1></Reveal>
                <Reveal delay={0.2}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 520, margin: '20px 0 28px' }}>Source, score, match, and place candidates faster — with a built-in CRM to run clients and deals, and AI that does the manual work so your recruiters don&apos;t.</p></Reveal>
                <Reveal delay={0.3}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button></div></Reveal>
              </div>
              <Reveal delay={0.2}><KanbanMock /></Reveal>
            </div>
          </Container>
        </section>

        {/* PROBLEM */}
        <section className="mk-section"><Container>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <Reveal><h2 className="mk-h2">Legacy ATS tools are heavy, manual, and barely intelligent.</h2></Reveal>
            <Reveal delay={0.1}><p style={{ fontSize: 17, color: T.slate, lineHeight: 1.7, marginTop: 18 }}>Recruiters drown in CV triage, pipelines live in spreadsheets, and “AI” means a keyword filter. Levl1 Hire rebuilds the ATS around intelligence.</p></Reveal>
          </div>
        </Container></section>

        {/* CORE CAPABILITIES */}
        <section className="mk-section" style={{ background: T.mist }}><Container>
          <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow color={T.violet}>Core capabilities</Eyebrow><h2 className="mk-h2">Everything a modern hiring team runs on.</h2></div></Reveal>
          <Stagger gap={0.06}><div className="mk-grid-2">
            {CAPS.map(([t, b]) => (
              <StaggerItem key={t}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 24, height: '100%', borderTop: `3px solid ${T.violet}` }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, marginBottom: 8 }}>{t}</div>
                <p style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6 }}>{b}</p>
              </div></StaggerItem>
            ))}
          </div></Stagger>
        </Container></section>

        {/* SCREEN PLUG-IN */}
        <section className="mk-section"><Container>
          <Reveal><div style={{ textAlign: 'center', marginBottom: 28 }}><Eyebrow color={T.violet}>One click to AI screening</Eyebrow><h2 className="mk-h2">Plugs into Levl1 Screen.</h2><p style={{ fontSize: 16, color: T.slate, maxWidth: 560, margin: '14px auto 0' }}>Trigger an autonomous AI interview from any candidate. The evidence-based score syncs straight back into the pipeline.</p></div></Reveal>
          <Reveal><div style={{ maxWidth: 560, margin: '0 auto' }}><ScorecardMock /></div></Reveal>
        </Container></section>

        {/* ROI */}
        <section className="mk-section" style={{ background: T.mist }}><Container>
          <Reveal><div style={{ textAlign: 'center', marginBottom: 36 }}><Eyebrow color={T.violet}>The outcome</Eyebrow><h2 className="mk-h2">What changes when the busywork is gone.</h2></div></Reveal>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 40 }}>
            <Reveal><DealPipelineMock /></Reveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ROI.map(([t, b]) => (
                <Reveal key={t}><div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: T.violet, fontWeight: 800, fontSize: 16 }}>✓</span>
                  <div><div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink }}>{t}</div><div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.5 }}>{b}</div></div>
                </div></Reveal>
              ))}
            </div>
          </div>
        </Container></section>

        {/* CTA */}
        <section className="mk-section"><Container style={{ textAlign: 'center' }}>
          <Reveal><h2 className="mk-h2" style={{ marginBottom: 22 }}>See Levl1 Hire on your own roles.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Link href="/pricing" style={{ fontSize: 15, fontWeight: 600, color: T.violet, padding: '13px 24px', borderRadius: 12, border: `1px solid ${T.violet}33`, textDecoration: 'none' }}>See pricing</Link></div></Reveal>
        </Container></section>
      </main>
      <MarketingFooter />
      <CookieBanner />
    </div>
  )
}
