import type { Metadata } from 'next'
import { Container, Reveal, Stagger, StaggerItem, Button, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { FeatureRow, SectionHead, Lev } from '@/components/marketing/hp'
import { KanbanMock, ScorecardMock, InterviewRoomMock, CandidateProfileMock } from '@/components/marketing/mocks'
import { SourcingMock, LevPanelMock, TeamMock, ConnectorMock } from '@/components/marketing/mocks/hirepilot'

export const metadata: Metadata = {
  title: 'HirePilot for In-House Teams — AI-native hiring',
  description: 'Fill your roles faster with AI that does the first 80%. Score every candidate, run first-round interviews, and keep your pipeline moving — with your team approving every decision. ATS-agnostic.',
  openGraph: { title: 'HirePilot for In-House Talent Teams', description: 'Fill your roles faster — with AI that does the first 80%.' },
}

export default function EnterprisePage() {
  return (
    <div>
      {/* 1 — HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 132, paddingBottom: 80, background: 'linear-gradient(180deg,#F5F3FF,#fff)' }}>
        <div className="mk-blob" style={{ width: 480, height: 480, background: '#A78BFA', top: -130, left: -90 }} />
        <div className="mk-blob" style={{ width: 440, height: 440, background: '#60A5FA', top: -60, right: -110 }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.violet, marginBottom: 18 }}>HirePilot for in-house talent teams</div></Reveal>
              <Reveal delay={0.05}><h1 className="mk-h1">Fill your roles faster — with AI that does <GradientText>the first 80%.</GradientText></h1></Reveal>
              <Reveal delay={0.12}><p style={{ fontSize: 18.5, color: T.slate, lineHeight: 1.6, maxWidth: 540, margin: '20px 0 26px' }}>An AI-native hiring platform for in-house teams. Score every candidate, run first-round interviews, and keep your pipeline moving — with your team approving every decision.</p></Reveal>
              <Reveal delay={0.18}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo →</Button><Button href="#capabilities" variant="ghost">See it work</Button></div></Reveal>
            </div>
            <Reveal delay={0.25}>
              <div style={{ position: 'relative' }}>
                <CandidateProfileMock />
                <div style={{ position: 'absolute', bottom: -20, right: -14, width: 220 }}><ScorecardMock /></div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 2 — TENSION */}
      <section style={{ background: T.ink, color: '#fff', padding: '92px 0' }}>
        <Container>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <Reveal><h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12 }}>200 applicants. One req. Your best hire lost to a faster company.</h2></Reveal>
            <Reveal delay={0.1}><p style={{ fontSize: 17.5, color: '#C7CCEA', lineHeight: 1.7, marginTop: 20 }}>In-house teams drown in volume and lose great candidates to slow, manual first rounds. Your recruiters do triage instead of talent strategy.</p></Reveal>
            <Reveal delay={0.2}><p style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, marginTop: 26 }}>HirePilot does the first 80% — <GradientText>so your team does the part that needs a human.</GradientText></p></Reveal>
          </div>
        </Container>
      </section>

      {/* 3 — CORE CAPABILITIES */}
      <section id="capabilities" className="mk-section">
        <Container>
          <SectionHead eyebrow="Core capabilities" title={<>Depth where in-house hiring <GradientText>actually breaks.</GradientText></>} />
          <FeatureRow index={0} eyebrow="Understand every candidate" title="Scored the moment they apply." value="A weighted rubric you control, with matched and missing skills plus the reasons — and it reads scanned and image résumés others drop." points={['Ranked shortlist, not a keyword filter', 'Matched / missing skills + reasoning', 'Reads scanned & image-PDF résumés']}><CandidateProfileMock /></FeatureRow>
          <FeatureRow index={1} eyebrow="Interview at scale" title={<>First rounds, run by AI, on your standard.</>} value="Levl1 Interviews (add-on): autonomous voice interviews with human-approved questions and evidence-based reports." points={['Autonomous AI voice interviews 24/7', 'Your team approves every question', 'Evidence report with a score & quotes']}><ScorecardMock /></FeatureRow>
          <FeatureRow index={2} eyebrow="Keep the pipeline moving" title="Nothing stalls, nothing slips." value={'A pipeline with reject/audit and AI matching — and Lev proposing the next action for you to approve.'} points={['Drag-drop pipeline with audit trail', 'AI matching surfaces best-fit', 'Lev proposes → you approve → advance']}><KanbanMock /></FeatureRow>
          <FeatureRow index={3} eyebrow="Source proactively" title="Reach passive talent, compliantly." value="AI search-strings, Chrome-extension capture, and talent-pool rediscovery of past candidates." points={['Board-ready boolean search strings', 'Capture with the Chrome extension', 'Rediscover past applicants in your pool']}><SourcingMock /></FeatureRow>
          <FeatureRow index={4} eyebrow="Run your team" title="Oversight, workload & throughput." value="A manager dashboard with position ageing, assignment, performance by day/week/month, and live status." points={['Workload balance across recruiters', 'Position ageing & throughput', 'Live login status & assignment']}><TeamMock /></FeatureRow>
        </Container>
      </section>

      {/* 4 — ENTERPRISE-GRADE */}
      <section className="mk-section" style={{ background: T.mist }}>
        <Container>
          <SectionHead eyebrow="Built for how enterprises buy" title={<>Enterprise-grade by default.</>} />
          <div className="mk-feat" style={{ margin: '40px 0 8px', alignItems: 'center' }}>
            <Reveal>
              <div>
                <Stagger>
                  {[
                    ['ATS-agnostic', 'Works alongside your system of record — connectors read in and write back. No rip-and-replace.'],
                    ['Security', 'Multi-tenant isolation, RBAC + granular roles, encryption in transit & at rest, audit logging — on SOC 2 Type II + ISO 27001 infrastructure.'],
                    ['Human-in-the-loop', 'AI proposes; your team decides. Every consequential action is approved by a human.'],
                    ['Scales with you', 'From one team to many, on one platform.'],
                  ].map(([h, b]) => (
                    <StaggerItem key={h}><div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <span style={{ color: T.violet, fontWeight: 800, fontSize: 18, lineHeight: 1.3 }}>◆</span>
                      <div><div style={{ fontSize: 16.5, fontWeight: 800, color: T.ink }}>{h}</div><div style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6, marginTop: 3 }}>{b}</div></div>
                    </div></StaggerItem>
                  ))}
                </Stagger>
              </div>
            </Reveal>
            <Reveal delay={0.1}><ConnectorMock /></Reveal>
          </div>
        </Container>
      </section>

      {/* 5 — ROI */}
      <section className="mk-section">
        <Container>
          <SectionHead eyebrow="Outcomes" title={<>What it changes for your team.</>} />
          <Stagger>
            <div className="mk-grid-2" style={{ marginTop: 8, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
              {[
                ['Time-to-shortlist down sharply', 'AI triages every applicant the moment they apply.'],
                ['Recruiters on strategy, not triage', 'The manual 80% is automated — humans do the rest.'],
                ['Consistent, defensible evaluation', 'One rubric, one standard, a full evidence trail.'],
                ['Works with your stack', 'ATS-agnostic — no rip-and-replace of your system of record.'],
              ].map(([h, b]) => (
                <StaggerItem key={h as string}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 24, height: '100%' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, marginBottom: 8 }}>{h}</div>
                  <div style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6 }}>{b}</div>
                </div></StaggerItem>
              ))}
            </div>
          </Stagger>
        </Container>
      </section>

      {/* 6 — CTA */}
      <section style={{ background: T.ink, color: '#fff', padding: '96px 0' }}>
        <Container style={{ textAlign: 'center' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Give your team the first <GradientText>80% back.</GradientText></h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize: 18, color: '#C7CCEA', marginTop: 16 }}>See HirePilot on your own roles.</p></Reveal>
          <Reveal delay={0.18}><div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="/contact" variant="light">Talk to sales</Button></div></Reveal>
        </Container>
      </section>
    </div>
  )
}
