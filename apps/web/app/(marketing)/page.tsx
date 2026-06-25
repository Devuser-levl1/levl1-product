'use client'
import { Container, Reveal, Stagger, StaggerItem, Button, Eyebrow, GradientText, T } from '@/components/marketing/ui'
import { KanbanMock, ScorecardMock, InterviewRoomMock, CandidateProfileMock } from '@/components/marketing/mocks'
import { motion } from 'framer-motion'
import Link from 'next/link'

// Three pillars — what Levl1 actually does.
const PILLARS: [string, string, string, React.ReactNode][] = [
  ['Understand every candidate, instantly.', 'AI reads and scores every résumé the moment it arrives — even scanned or image PDFs — against a rubric you control. No more manual triage.', T.violet, <CandidateProfileMock key="a" />],
  ['Interview at scale, fairly.', 'Autonomous AI voice interviews run first rounds 24/7 — structured, consistent, evidence-backed — using questions your team approves. Every candidate gets a fair shot; your seniors only meet the best.', T.indigo, <InterviewRoomMock key="b" />],
  ['Run the whole pipeline, intelligently.', 'A complete ATS + CRM with AI matching, agentic actions, sourcing, and a manager’s-eye view of the whole team — lean where legacy tools are bloated.', T.purple, <KanbanMock key="c" />],
]

const WHY: [string, string][] = [
  ['A real AI platform — not an ATS with a few AI buttons.', 'Intelligence runs through every step.'],
  ['You stay in control.', 'AI proposes; humans approve. Always.'],
  ['Reads what others can’t.', 'Scanned résumés, image PDFs, messy data — handled.'],
  ['Lean by design.', 'The power of legacy suites without the bloat and the six-week onboarding.'],
  ['Works with your stack.', 'ATS-agnostic; screening plugs into what you already run.'],
]

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 148, paddingBottom: 72, background: 'linear-gradient(180deg,#F5F7FF, #fff)' }}>
        <div className="mk-blob" style={{ width: 460, height: 460, background: '#A78BFA', top: -120, left: -80 }} />
        <div className="mk-blob" style={{ width: 420, height: 420, background: '#60A5FA', top: -60, right: -100, animationDelay: '4s' }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow>The AI hiring &amp; screening platform</Eyebrow></Reveal>
              <Reveal delay={0.1}><h1 className="mk-h1">Hiring is still mostly manual. <GradientText>We changed that.</GradientText></h1></Reveal>
              <Reveal delay={0.3}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 560, margin: '22px 0 26px' }}>Levl1 reads résumés, scores candidates, runs first-round interviews, and drafts your jobs — so your team spends its time on people, not paperwork. One intelligent platform for recruitment agencies and in-house talent teams.</p></Reveal>
              <Reveal delay={0.4}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="#how">See Levl1 in action</Button><Button href="/contact" variant="ghost">Book a demo</Button></div></Reveal>
            </div>
            <Reveal delay={0.2}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', color: T.violet, marginBottom: 6 }}>LEVL1 HIRE</div><KanbanMock /></div>
              <div><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', color: T.indigo, marginBottom: 6 }}>LEVL1 SCREEN</div><ScorecardMock /></div>
            </div></Reveal>
          </div>
        </Container>
      </section>

      {/* THE HOOK */}
      <section className="mk-section"><Container>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Reveal><h2 className="mk-h2" style={{ textAlign: 'center' }}>The first round is where hiring breaks.</h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize: 17, color: T.slate, lineHeight: 1.75, marginTop: 22 }}>A recruiter opens 200 résumés for one role. Two days of reading. Gut-feel shortlisting. The best candidate accepts another offer before anyone calls them. The client re-screens everything anyway. Multiply that across every open role, every week.</p></Reveal>
          <Reveal delay={0.15}><p style={{ fontSize: 17, color: T.slate, lineHeight: 1.75, marginTop: 16 }}>That&apos;s not a people problem — it&apos;s a tooling problem. Every other industry handed its repetitive work to software. Recruitment got dashboards and called it innovation.</p></Reveal>
          <Reveal delay={0.2}><p style={{ fontSize: 19, fontWeight: 800, color: T.ink, lineHeight: 1.5, marginTop: 22, textAlign: 'center' }}>Levl1 is different: <GradientText>the AI does the work, your team makes the decisions.</GradientText></p></Reveal>
        </div>
      </Container></section>

      {/* THREE PILLARS */}
      <section id="how" className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 44 }}><Eyebrow>What Levl1 actually does</Eyebrow><h2 className="mk-h2">Three things, done intelligently.</h2></div></Reveal>
        {PILLARS.map(([title, body, accent, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '44px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}>
              <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, color: accent, marginBottom: 10 }}>{`0${i + 1}`}</span>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p>
            </div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
          </div></Reveal>
        ))}
      </Container></section>

      {/* TWO PRODUCTS STRIP */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow>One platform, two products</Eyebrow><h2 className="mk-h2">Use either on its own. Use both, and they work as one.</h2></div></Reveal>
        <div className="mk-grid-2">
          <Reveal><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.violet}`, height: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.violet, letterSpacing: '0.1em' }}>LEVL1 HIRE</div>
            <h3 style={{ fontSize: 21, fontWeight: 800, margin: '8px 0' }}>AI-native ATS + CRM.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 18 }}>Source, score, match, and place — with intelligence built in.</p>
            <Link href="/hire" style={{ fontSize: 15, fontWeight: 700, color: T.violet, textDecoration: 'none' }}>Explore Hire →</Link>
          </div></Reveal>
          <Reveal delay={0.1}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.indigo}`, height: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.indigo, letterSpacing: '0.1em' }}>LEVL1 SCREEN</div>
            <h3 style={{ fontSize: 21, fontWeight: 800, margin: '8px 0' }}>Autonomous AI voice interviews.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 18 }}>Plug into Levl1 Hire or any ATS you already use.</p>
            <Link href="/interviews" style={{ fontSize: 15, fontWeight: 700, color: T.indigo, textDecoration: 'none' }}>Explore Screen →</Link>
          </div></Reveal>
        </div>
        <Reveal><div style={{ textAlign: 'center', marginTop: 22, fontSize: 15, fontWeight: 600, color: T.purple }}>Use either on its own. Use both, and they work as one.</div></Reveal>
      </Container></section>

      {/* WHY LEVL1 */}
      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow>Why Levl1</Eyebrow><h2 className="mk-h2">Built like an AI product, not a bolt-on.</h2></div></Reveal>
        <Stagger gap={0.08}><div className="mk-grid-3">
          {WHY.map(([t, b]) => (
            <StaggerItem key={t}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 22, height: '100%' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.violet}, ${T.indigo})`, marginBottom: 12 }} />
              <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 6, lineHeight: 1.35 }}>{t}</div>
              <div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.55 }}>{b}</div>
            </div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      {/* ENTERPRISE STRIP */}
      <section style={{ background: T.ink, padding: '72px 0' }}><Container style={{ textAlign: 'center' }}>
        <Reveal><h2 style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Built for scale and security.</h2>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {['SSO-ready', 'Role-based access', 'Tenant data isolation', 'Audit trails', 'Encrypted at rest', 'Data residency'].map((x) => <span key={x} style={{ fontSize: 13.5, fontWeight: 600, color: '#C7CCEA', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '8px 16px' }}>{x}</span>)}
        </div></Reveal>
      </Container></section>

      {/* CLOSING CTA */}
      <section className="mk-section" style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(120deg,#6D28D9,#4F46E5 55%,#2563EB)' }}>
        <Container style={{ position: 'relative' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(28px,4.2vw,48px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', maxWidth: 760, marginInline: 'auto' }}>See what hiring feels like when the busywork is gone.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}><Button href="/contact" variant="light">Book a demo</Button><Link href="/contact" style={{ fontSize: 15, fontWeight: 600, color: '#fff', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', textDecoration: 'none' }}>Talk to us</Link></div></Reveal>
        </Container>
      </section>
    </div>
  )
}
