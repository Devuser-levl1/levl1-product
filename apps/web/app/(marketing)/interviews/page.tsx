import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Reveal, Stagger, StaggerItem, Button, Eyebrow, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { ScorecardMock, ApprovalMock, InterviewRoomMock, VerificationMock } from '@/components/marketing/mocks'
import { DemoGallery } from '@/components/screen/demo/DemoGallery'

export const metadata: Metadata = {
  title: 'Levl1 Interviews — AI Round-1 screening that frees recruiters & protects hiring quality',
  description: 'A fair, structured, trustworthy ~18-minute AI voice interview for every candidate. Give recruiters their hours back, screen consistently at scale, and make decisions you can defend — backed by evidence, not a bare number.',
  openGraph: { title: 'Levl1 Interviews', description: 'Round-1 screening that frees your recruiters and protects hiring quality.' },
}

// ── The pain (hiring-leader POV) → the relief Levl1 delivers ──
const PAINS: [string, string][] = [
  ['Recruiters drowning in Round-1', 'Your team burns hours on repetitive first-round screens — most of which end in a “no.” That time should go to the candidates worth meeting.'],
  ['Inconsistent, subjective screening', 'Every interviewer asks differently and scores differently. The result is low-signal, hard to compare, and impossible to defend as fair.'],
  ['Candidates gaming AI screens', 'Overlay “interview copilots” feed answers in real time. If you can’t tell, you can’t trust the score — or the hire.'],
  ['Slow time-to-screen', 'Scheduling friction and a slow funnel lose your best candidates to faster competitors before you ever speak to them.'],
  ['Reports you can’t defend', 'A bare number means nothing to a hiring manager. When they ask “why this candidate?”, you need evidence, not a vibe.'],
]

// ── Capabilities reframed as business outcomes ──
const OUTCOMES: [string, string][] = [
  ['Hours back, every role', 'Every applicant gets a real Round-1 — automatically. Recruiters skip the repetitive screens and spend their time only on evidence-backed shortlists.'],
  ['Consistent & fair at scale', 'The exact same structured screen for everyone — technical, scenario, behavioural, EQ and culture-fit. Comparable signal you can stand behind.'],
  ['Results you can trust', 'Integrity signals (tab, second person, gaze, second voice, AI-assistant patterns) are flagged with evidence for human review — never an auto-reject.'],
  ['A faster funnel', 'Candidates self-schedule and complete a crisp ~18-minute screen. Good people move forward in days, not weeks.'],
  ['Defensible decisions', 'Every score expands to the exact transcript evidence behind it — a report your hiring panel can actually act on.'],
]

// ── Features (HOW we deliver the value) — supporting, below the value case ──
const FEATURES: [string, string, React.ReactNode][] = [
  ['Trust & integrity, with evidence', 'Evidence-based fraud & integrity detection — tab/window switches, a second person on camera, sustained off-screen gaze, a second/whispering voice, and AI-assistant answer patterns. Every flag carries its evidence and routes to a human reviewer. It surfaces what to look at; it never auto-disqualifies and never changes the competency score. Honest by design — not a claim to “catch all cheating.”', <VerificationMock key="d" />],
  ['Autonomous voice depth', 'A real conversation, not a form. Adaptive technical questioning with reactive follow-ups, a live code editor and a whiteboard — candidates demonstrate, they don’t just describe. The interviewer probes the highest-signal gaps and knows when to move on.', <InterviewRoomMock key="b" />],
  ['Crisp & structured', 'A focused ~17–18 minute screen: a depth-first Q&A (4–5 questions with full adaptive follow-ups) plus a short Likert culture-fit segment. Respects the candidate’s time and your recruiters’.', <ApprovalMock key="a" />],
  ['Evidence-based reports', 'Verdict-forward and defensible: competency, communication, culture/values fit and integrity as separate panels — every score expands to the transcript evidence behind it. Nothing inferred, nothing fabricated.', <ScorecardMock key="c" />],
]

export default function InterviewsPage() {
  return (
    <div>
      {/* 1 ── HERO: lead with the outcome, not the mechanism ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 72, background: 'linear-gradient(180deg,#F5F7FF,#fff)' }}>
        <div className="mk-blob" style={{ width: 440, height: 440, background: '#A5B4FC', top: -120, left: -90 }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow color={T.indigo}>Levl1 Interviews · AI Round-1 screening</Eyebrow></Reveal>
              <Reveal delay={0.1}><h1 className="mk-h1">Round-1 screening that frees your recruiters and <GradientText>protects hiring quality.</GradientText></h1></Reveal>
              <Reveal delay={0.2}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 520, margin: '20px 0 28px' }}>Levl1 gives every candidate a fair, structured, trustworthy first-round voice interview — so your team spends its hours on the people worth meeting, not on repetitive screens that mostly filter out. Decisions you can defend, backed by evidence rather than a bare number.</p></Reveal>
              <Reveal delay={0.3}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="#try-live">Try a live interview</Button><Button href="/contact" variant="ghost">Talk to sales</Button></div></Reveal>
            </div>
            <Reveal delay={0.2}><ScorecardMock /></Reveal>
          </div>
        </Container>
      </section>

      {/* 2 ── THE PAIN being killed (hiring-leader POV) ── */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 36 }}><Eyebrow color={T.violet}>What Round-1 looks like today</Eyebrow><h2 className="mk-h2">The screening problems you live with.</h2></div></Reveal>
        <Stagger><div className="mk-grid-3">
          {PAINS.map(([title, body]) => (
            <StaggerItem key={title}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: '22px 22px', height: '100%' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#DC2626', marginBottom: 8 }}>The problem today</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: T.ink, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      {/* 3 ── THE OUTCOMES / value delivered ── */}
      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 14 }}><Eyebrow color={T.indigo}>What changes with Levl1</Eyebrow><h2 className="mk-h2">From a time sink to a hiring advantage.</h2></div></Reveal>
        <Reveal delay={0.05}><p style={{ textAlign: 'center', fontSize: 16, color: T.slate, maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.6 }}>Levl1 turns Round-1 into consistent, trustworthy, recruiter-light screening — measured in hours saved per role and decisions you can defend.</p></Reveal>
        <Stagger><div className="mk-grid-3">
          {OUTCOMES.map(([title, body], i) => (
            <StaggerItem key={title}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: '22px', height: '100%' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${T.indigo},${T.violet})`, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{i + 1}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: T.ink, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ fontSize: 14.5, color: T.slate, lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div></StaggerItem>
          ))}
        </div></Stagger>
        <Reveal delay={0.1}><div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}>
          {[['~18 min', 'per structured screen'], ['Every applicant', 'gets a real Round-1'], ['Evidence-linked', 'on every score']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}><div style={{ fontSize: 30, fontWeight: 800, color: T.indigo, lineHeight: 1 }}>{n}</div><div style={{ fontSize: 13, color: T.slate, marginTop: 4 }}>{l}</div></div>
          ))}
        </div></Reveal>
      </Container></section>

      {/* 4 ── See it: the no-friction demo gallery (Build 05) ── */}
      <section className="mk-section" style={{ paddingTop: 28 }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 4 }}><Eyebrow color={T.violet}>See it for yourself</Eyebrow></div></Reveal>
        <DemoGallery />
      </section>

      {/* 5 ── HOW WE DELIVER IT: features support the value case (not lead it) ── */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 8 }}><Eyebrow color={T.indigo}>How we deliver it</Eyebrow><h2 className="mk-h2">The product behind the outcomes.</h2></div></Reveal>
        {FEATURES.map(([title, body, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '40px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}><div style={{ fontSize: 13, fontWeight: 800, color: T.indigo }}>{String(i + 1).padStart(2, '0')}</div><h3 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 12px' }}>{title}</h3><p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p></div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
          </div></Reveal>
        ))}
      </Container></section>

      {/* 6 ── HOW IT WORKS ── */}
      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow color={T.indigo}>How an interview works</Eyebrow><h2 className="mk-h2">Job description in. Evidence report out.</h2></div></Reveal>
        <Stagger><div className="mk-grid-3" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          {['Invite & self-schedule', 'Consent', 'Identity check', '~18-min AI interview', 'Evidence report', 'Ranked shortlist'].map((s, i) => (
            <StaggerItem key={s}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, padding: 16, textAlign: 'center', height: '100%' }}><div style={{ width: 26, height: 26, borderRadius: 99, background: `linear-gradient(135deg,${T.indigo},${T.sky})`, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{i + 1}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{s}</div></div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      {/* 7 ── SOCIAL PROOF placeholder + final CTA ── */}
      <section className="mk-section" style={{ textAlign: 'center', background: 'linear-gradient(120deg,#4F46E5,#2563EB)' }}><Container>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, color: '#fff' }}>Screen every candidate. Trust every result.</h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 600, margin: '14px auto 26px', lineHeight: 1.6 }}>Give your recruiters their hours back, screen consistently at scale, and hand your hiring managers evidence they can act on. You stay in control — the evidence does the convincing.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}><Button href="#try-live" variant="light">Try a live interview</Button><Button href="/contact" variant="light">Talk to sales</Button><Link href="/pricing" style={{ fontSize: 15, fontWeight: 600, color: '#fff', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', textDecoration: 'none' }}>View pricing</Link></div>
        </Reveal>
      </Container></section>
    </div>
  )
}
