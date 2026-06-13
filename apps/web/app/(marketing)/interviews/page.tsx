import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Reveal, Stagger, StaggerItem, Button, Eyebrow, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { ScorecardMock, ApprovalMock, InterviewRoomMock, VerificationMock } from '@/components/marketing/mocks'

export const metadata: Metadata = {
  title: 'Levl1 Interviews — Autonomous AI voice interviews',
  description: 'Structured 30-minute AI voice interviews across technical, scenario, behavioral and EQ — with questions your team approves and evidence-based reports your stakeholders trust.',
  openGraph: { title: 'Levl1 Interviews', description: 'First-round interviews, done for you.' },
}

const FEATURES: [string, string, React.ReactNode][] = [
  ['Human-in-the-loop', 'Your team approves every question bank, and clients approve the scoring rubric. Autonomy without losing control.', <ApprovalMock key="a" />],
  ['Real technical depth', 'Voice, a live Monaco code editor and a whiteboard — candidates demonstrate, they don’t just describe.', <InterviewRoomMock key="b" />],
  ['Evidence-based scoring', 'Every score is tied to the transcript. Nothing is inferred; nothing is fabricated.', <ScorecardMock key="c" />],
  ['Identity & integrity', 'OTP, photo capture and a live integrity score. The AI flags concerns — it never auto-rejects.', <VerificationMock key="d" />],
]

export default function InterviewsPage() {
  return (
    <div>
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 80, background: 'linear-gradient(180deg,#F5F7FF,#fff)' }}>
        <div className="mk-blob" style={{ width: 440, height: 440, background: '#A5B4FC', top: -120, left: -90 }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow color={T.indigo}>Levl1 Interviews · Autonomous AI voice interviews</Eyebrow></Reveal>
              <Reveal delay={0.1}><h1 className="mk-h1">First-round interviews, <GradientText>done for you.</GradientText></h1></Reveal>
              <Reveal delay={0.2}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 510, margin: '20px 0 28px' }}>Levl1 conducts structured 30-minute voice interviews across technical, scenario, behavioral and EQ — with questions your team approves and reports your stakeholders trust. Evaluate every candidate, not just the lucky few.</p></Reveal>
              <Reveal delay={0.3}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="/contact" variant="ghost">See a sample report</Button></div></Reveal>
            </div>
            <Reveal delay={0.2}><ScorecardMock /></Reveal>
          </div>
        </Container>
      </section>

      <section className="mk-section"><Container>
        {FEATURES.map(([title, body, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '40px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}><div style={{ fontSize: 13, fontWeight: 800, color: T.indigo }}>{String(i + 1).padStart(2, '0')}</div><h3 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 12px' }}>{title}</h3><p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p></div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
          </div></Reveal>
        ))}
      </Container></section>

      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow color={T.indigo}>How an interview works</Eyebrow><h2 className="mk-h2">Fair, structured, verifiable.</h2></div></Reveal>
        <Stagger><div className="mk-grid-3" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          {['Invite', 'Consent', 'Identity check', '30-min AI interview', 'Evidence report', 'Ranked shortlist'].map((s, i) => (
            <StaggerItem key={s}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, padding: 16, textAlign: 'center', height: '100%' }}><div style={{ width: 26, height: 26, borderRadius: 99, background: `linear-gradient(135deg,${T.indigo},${T.sky})`, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{i + 1}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{s}</div></div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      <section className="mk-section" style={{ textAlign: 'center', background: 'linear-gradient(120deg,#4F46E5,#2563EB)' }}><Container>
        <Reveal><h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, color: '#fff' }}>Why agencies trust AI screening.</h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 600, margin: '14px auto 26px', lineHeight: 1.6 }}>Every question is human-approved. Every score is backed by evidence. Identity is verified. You stay in control — the evidence does the convincing.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}><Button href="/contact" variant="light">Book a demo</Button><Link href="/pricing" style={{ fontSize: 15, fontWeight: 600, color: '#fff', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', textDecoration: 'none' }}>View pricing</Link></div></Reveal>
      </Container></section>
    </div>
  )
}
