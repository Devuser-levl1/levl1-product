import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Reveal, Stagger, StaggerItem, Button, Eyebrow, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { ScorecardMock, ApprovalMock, InterviewRoomMock, VerificationMock } from '@/components/marketing/mocks'
import { DemoGallery } from '@/components/screen/demo/DemoGallery'

export const metadata: Metadata = {
  title: 'Levl1 Screen — Autonomous AI voice interviews',
  description: 'Structured 30-minute AI voice interviews — technical, behavioral, and culture-fit — with questions your team approves and reports your stakeholders trust. Evaluate every candidate, not just the lucky few. Works standalone or on top of any ATS.',
  openGraph: { title: 'Levl1 Screen', description: 'First-round interviews, done for you.' },
}

const CAPS: [string, string, React.ReactNode][] = [
  ['Autonomous voice interviews', 'A natural, 30-minute spoken interview that adapts to the candidate — with a live code editor and a whiteboard for technical depth. It probes like a senior interviewer, not a form.', <InterviewRoomMock key="a" />],
  ['Questions your team approves', 'Your tech lead and HR approve the question bank; you set the bar. AI conducts and evaluates; humans decide. It never auto-rejects. Single-approver by default — light for small teams, with dual approval available.', <ApprovalMock key="b" />],
  ['Evidence-based reports', 'Every score is tied to what the candidate actually said. Ranked, white-labeled reports that read like a great panelist’s notes — so hiring managers advance candidates without re-screening.', <ScorecardMock key="c" />],
  ['Identity & integrity', 'Email verification, webcam capture, and integrity signals on every interview — flagged for human review, never auto-failed. Trust built in.', <VerificationMock key="d" />],
]

const ROI: [string, string][] = [
  ['Reclaim senior engineers’ time', 'They stop running first rounds and only meet the shortlisted few.'],
  ['Evaluate 100% of candidates', 'Fairly and fast, not just the first few who fit a slot.'],
  ['Interview within hours, not weeks', 'Candidates self-schedule; you move before rivals do.'],
  ['Consistent, defensible scoring', 'One approved rubric, every candidate, full evidence trail.'],
  ['A fraction of the cost of a human first-round', 'Available 24/7, at scale.'],
]

export default function ScreenMarketing() {
  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 80, background: 'linear-gradient(180deg,#EEF2FF,#fff)' }}>
        <div className="mk-blob" style={{ width: 440, height: 440, background: '#A5B4FC', top: -120, left: -90 }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow color={T.indigo}>Levl1 Screen · Autonomous AI voice interviews</Eyebrow></Reveal>
              <Reveal delay={0.1}><h1 className="mk-h1">First-round interviews, <GradientText>done for you.</GradientText></h1></Reveal>
              <Reveal delay={0.2}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 540, margin: '20px 0 28px' }}>Structured 30-minute AI voice interviews — technical, behavioral, and culture-fit — with questions your team approves and reports your stakeholders trust. Evaluate every candidate, not just the lucky few. Works standalone or on top of any ATS.</p></Reveal>
              <Reveal delay={0.3}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="#try-live" variant="ghost">See it in action ↓</Button></div></Reveal>
            </div>
            <Reveal delay={0.2}><InterviewRoomMock /></Reveal>
          </div>
        </Container>
      </section>

      {/* PROBLEM */}
      <section className="mk-section"><Container>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <Reveal><h2 className="mk-h2">The first round is your worst bottleneck.</h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize: 17, color: T.slate, lineHeight: 1.7, marginTop: 18 }}>Senior interviewers don&apos;t scale, great candidates drop off while they wait, and unstructured interviews are inconsistent and hard to defend. Levl1 Screen removes the bottleneck without lowering the bar.</p></Reveal>
        </div>
      </Container></section>

      {/* CORE CAPABILITIES */}
      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow color={T.indigo}>Core capabilities</Eyebrow><h2 className="mk-h2">A real first round — conducted by AI.</h2></div></Reveal>
        {CAPS.map(([title, body, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '44px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p>
            </div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
          </div></Reveal>
        ))}
        <Reveal><div className="mk-grid-2" style={{ marginTop: 8 }}>
          <div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 24, borderTop: `3px solid ${T.indigo}` }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Candidate-friendly scheduling</div>
            <p style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6 }}>Self-scheduling with consent capture; invites and reminders by email and WhatsApp. Candidates interview within hours, before competitors reach them.</p>
          </div>
          <div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 24, borderTop: `3px solid ${T.indigo}` }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Plugs into your stack</div>
            <p style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6 }}>Use Levl1 Screen on its own, or connect it to Levl1 Hire and other ATSs — pull candidates in, push results back. ATS-agnostic by design.</p>
          </div>
        </div></Reveal>
      </Container></section>

      {/* SEE IT IN ACTION */}
      <section id="try-live" className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 8 }}><Eyebrow color={T.indigo}>See it for yourself</Eyebrow></div></Reveal>
        <DemoGallery />
      </Container></section>

      {/* ROI */}
      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 36 }}><Eyebrow color={T.indigo}>The outcome</Eyebrow><h2 className="mk-h2">Remove the bottleneck. Keep the bar.</h2></div></Reveal>
        <Stagger gap={0.08}><div className="mk-grid-3">
          {ROI.map(([t, b]) => (
            <StaggerItem key={t}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 22, height: '100%' }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 6, lineHeight: 1.35 }}>{t}</div>
              <div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.55 }}>{b}</div>
            </div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      {/* CTA */}
      <section className="mk-section" style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(120deg,#4F46E5,#6D28D9)' }}>
        <Container style={{ position: 'relative' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Give every candidate a fair first round.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}><Button href="/contact" variant="light">Book a demo</Button><Link href="/pricing" style={{ fontSize: 15, fontWeight: 600, color: '#fff', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', textDecoration: 'none' }}>See pricing</Link></div></Reveal>
        </Container>
      </section>
    </div>
  )
}
