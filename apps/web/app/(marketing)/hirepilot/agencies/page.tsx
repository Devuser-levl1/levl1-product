import type { Metadata } from 'next'
import { Container, Reveal, Stagger, StaggerItem, CountUp, Button, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { FeatureRow, SectionHead, Lev } from '@/components/marketing/hp'
import { KanbanMock, DealPipelineMock } from '@/components/marketing/mocks'
import { JDRubricMock, SourcingMock, SubmitSheetMock, InboxMock, LevPanelMock, ARMock, NurtureMock, TeamMock } from '@/components/marketing/mocks/hirepilot'

export const metadata: Metadata = {
  title: 'HirePilot for Staffing Agencies — AI-native ATS + CRM',
  description: 'Run every client, every role, every placement on autopilot. Source, screen, submit, place and get paid — with AI doing the manual work and Lev, your AI agent, driving it.',
  openGraph: { title: 'HirePilot for Staffing Agencies', description: 'Run every client, role and placement on autopilot.' },
}

export default function AgenciesPage() {
  return (
    <div>
      {/* 1 — HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 132, paddingBottom: 80, background: 'linear-gradient(180deg,#F5F3FF,#fff)' }}>
        <div className="mk-blob" style={{ width: 480, height: 480, background: '#A78BFA', top: -130, left: -90 }} />
        <div className="mk-blob" style={{ width: 440, height: 440, background: '#60A5FA', top: -60, right: -110 }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.violet, marginBottom: 18 }}>HirePilot for staffing agencies</div></Reveal>
              <Reveal delay={0.05}><h1 className="mk-h1">Run every client, every role, every placement — <GradientText>on autopilot.</GradientText></h1></Reveal>
              <Reveal delay={0.12}><p style={{ fontSize: 18.5, color: T.slate, lineHeight: 1.6, maxWidth: 540, margin: '20px 0 26px' }}>The AI-native ATS + CRM built for agencies. Source, screen, submit, place — and get paid — with AI doing the manual work and <Lev />, your AI agent, driving it.</p></Reveal>
              <Reveal delay={0.18}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo →</Button><Button href="#loop" variant="ghost">See it work</Button></div></Reveal>
            </div>
            <Reveal delay={0.25}>
              <div style={{ position: 'relative' }}>
                <Stagger gap={0.12}>
                  <StaggerItem><KanbanMock /></StaggerItem>
                </Stagger>
                {/* placement counter overlay */}
                <div style={{ position: 'absolute', bottom: -22, left: -14, background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, boxShadow: '0 24px 50px -20px rgba(30,27,75,0.35)', padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Placements this quarter</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: T.violet }}><CountUp to={92} /></div>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 2 — TENSION */}
      <section style={{ background: T.ink, color: '#fff', padding: '92px 0' }}>
        <Container>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <Reveal><h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12 }}>Spreadsheets for clients. Inboxes for candidates. Follow-ups you forget. Invoices you chase.</h2></Reveal>
            <Reveal delay={0.1}><p style={{ fontSize: 17.5, color: '#C7CCEA', lineHeight: 1.7, marginTop: 20 }}>Agencies run on hustle and glue. Every role juggled across tools, every placement a scramble, every payment a reminder you had to remember to send.</p></Reveal>
            <Reveal delay={0.2}><p style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, marginTop: 26 }}>HirePilot puts the whole business in one place — <GradientText>and lets AI run the busywork.</GradientText></p></Reveal>
          </div>
          {/* tool-sprawl → one window */}
          <Reveal delay={0.1}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 44, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 320, opacity: 0.5 }}>
                {['Spreadsheet', 'Email', 'WhatsApp', 'Job board', 'Invoices', 'CRM', 'Notes', 'Trackers'].map((t) => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 600, color: '#8B93C0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 11px' }}>{t}</span>
                ))}
              </div>
              <div style={{ color: '#6D28D9', fontSize: 28 }}>→</div>
              <div style={{ background: 'linear-gradient(120deg,#7C3AED,#4F46E5)', borderRadius: 14, padding: '16px 22px', fontWeight: 800, fontSize: 16, boxShadow: '0 20px 50px -18px rgba(124,58,237,0.6)' }}>One HirePilot window</div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 3 — THE CORE LOOP */}
      <section id="loop" className="mk-section">
        <Container>
          <SectionHead eyebrow="The core loop" title={<>From open role to placement — <GradientText>without the busywork.</GradientText></>} />
          <FeatureRow index={0} eyebrow="Win the role faster" title="Describe it, HirePilot writes it." value="An AI job-brief from a nudge, a weighted rubric you control, and every candidate scored on arrival — even scanned résumés." points={['Deep, role-specific JD in seconds', 'Weighted rubric — you decide what matters', 'Every CV scored & ranked, incl. image PDFs']}><JDRubricMock /></FeatureRow>
          <FeatureRow index={1} eyebrow="Source without the grind" title="Find them everywhere, in one place." value="AI search-strings per board, Chrome-extension capture, and one-click posting to your own board accounts." points={['Naukri boolean + LinkedIn/Indeed queries', 'Capture profiles with the Chrome extension', 'BYOB posting — under your own accounts']}><SourcingMock /></FeatureRow>
          <FeatureRow index={2} eyebrow="Submit in one click" title="Send your shortlist, formatted their way." value="Select candidates and send the client an email with résumés attached plus an Excel summary in their own column format." points={['One action: email + résumés + .xlsx', "Each client's own columns & order", 'Candidates marked submitted, logged']}><SubmitSheetMock /></FeatureRow>
          <FeatureRow index={3} eyebrow="Never drop a thread" title="Email + WhatsApp, one inbox." value="Read and reply across email and WhatsApp. Inbound job specs and résumés flow straight into jobs." points={['Unified inbox with channel labels', 'A WhatsApp job-spec → a draft job', 'Résumé attachments → scored candidates']}><InboxMock /></FeatureRow>
          <FeatureRow index={4} eyebrow="Meet Lev" title={<>Your AI agent that does, not just suggests.</>} value={'Lev sources, drafts, moves candidates and chases — proposing actions you approve, then executing them.'} points={['“Find 5 candidates and add to the pipeline.”', 'Proposes → you approve → it executes', 'Acts across the whole workspace']}><LevPanelMock /></FeatureRow>
        </Container>
      </section>

      {/* 4 — RUN THE BUSINESS */}
      <section className="mk-section" style={{ background: T.mist }}>
        <Container>
          <SectionHead eyebrow="The agency-only power" title={<>Not just hiring. <GradientText>Your whole agency.</GradientText></>} />
          <FeatureRow index={0} eyebrow="CRM + deals" title="Clients, contacts & contract value in one place." value="Deal math — positions × rate × hours × duration — linked to the jobs you're working." points={['A real CRM: clients, contacts, deals', 'Automatic contract-value calculation', 'Deals linked to live jobs']}><DealPipelineMock /></FeatureRow>
          <FeatureRow index={1} eyebrow="Receivables" title={<>Receivables that chase themselves.</>} value={'Lev nudges clients to pay on your schedule. AR ageing, auto-reminders after N days, mark-paid stops them.'} points={['Ageing buckets across every client', 'Escalating auto-reminders by Lev', 'Mark paid → nudges stop']}><ARMock /></FeatureRow>
          <FeatureRow index={2} eyebrow="Keep placements warm" title={<>Automated 15 / 30 / 60 / 90-day check-ins.</>} value={'Lev checks in with placed candidates on WhatsApp & email. You see who’s still working — and get paid at 90 days.'} points={['Structured check-ins, one-tap replies', 'Flags anyone who leaves early', 'Protects your placement fee']}><NurtureMock /></FeatureRow>
          <FeatureRow index={3} eyebrow="Oversight" title="See your whole team." value="Who's on what, who's ageing, who's winning — manager oversight, workload, drag-drop assignment, throughput and live login status." points={['Position ageing & workload balance', 'Drag-drop job assignment', 'Throughput dashboard + live status']}><TeamMock /></FeatureRow>
        </Container>
      </section>

      {/* 5 — ROI */}
      <section className="mk-section">
        <Container>
          <SectionHead eyebrow="Outcomes" title={<>What it changes for your agency.</>} />
          <Stagger>
            <div className="mk-grid-3" style={{ marginTop: 8 }}>
              {[
                ['More placements per recruiter', 'AI triages, ranks, drafts and chases — recruiters spend time on people, not paperwork.'],
                ['Get paid faster', 'Receivables that remind themselves — no invoice slips through the cracks.'],
                ['Protect your fee', 'Nurture confirms placements stick to 90 days, so revenue lands.'],
                ['One platform, not five tools', 'ATS + CRM + sourcing + comms + collections, in one workspace.'],
                ['Live the same day', 'No implementation project — connect and go.'],
                ['Lev on every step', 'An AI agent that proposes and executes across the whole business.'],
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
          <Reveal><h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Run your whole agency on <GradientText>HirePilot.</GradientText></h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize: 18, color: '#C7CCEA', marginTop: 16 }}>See it work on your own roles and clients.</p></Reveal>
          <Reveal delay={0.18}><div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="/contact" variant="light">Contact for pricing</Button></div></Reveal>
        </Container>
      </section>
    </div>
  )
}
