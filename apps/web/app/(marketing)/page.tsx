'use client'
import { Container, Reveal, Stagger, StaggerItem, CountUp, Button, Eyebrow, GradientText, T } from '@/components/marketing/ui'
import { KanbanMock, ScorecardMock, InterviewRoomMock, DealPipelineMock, CandidateProfileMock, IntegrationCardMock } from '@/components/marketing/mocks'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const ROI: [number, string, string, string][] = [
  [90, '', '%', 'less time on first-round screening'],
  [5, '<', ' days', 'from open role to ranked shortlist'],
  [3, '', 'x', 'more candidates evaluated per recruiter'],
  [100, '', '%', 'candidates assessed on one objective rubric'],
]

// product tag: HIRE (violet) / INTERVIEWS (indigo) / PLATFORM (purple)
const WHY: [string, string, string, string, React.ReactNode][] = [
  ['HIRE', T.violet, 'Intelligent pipelines', 'AI scores every applicant the moment they land and surfaces the best instantly — so your pipeline ranks itself.', <KanbanMock key="a" />],
  ['INTERVIEWS', T.indigo, 'Autonomous AI interviews', 'Structured 30-minute voice interviews across technical, scenario, behavioral and EQ — run at scale, on demand.', <InterviewRoomMock key="b" />],
  ['HIRE', T.violet, 'Built-in CRM & deals', 'Manage clients, contacts and a revenue pipeline right alongside hiring — your whole business in one view.', <DealPipelineMock key="c" />],
  ['INTERVIEWS', T.indigo, 'Evidence-based reports', 'Ranked shortlists where every score is tied to the transcript. Nothing inferred, nothing fabricated.', <ScorecardMock key="d" />],
  ['HIRE', T.violet, 'Smart candidate management', 'Bulk import, AI extraction from résumés, source tracking and full activity timelines for every candidate.', <CandidateProfileMock key="e" />],
  ['PLATFORM', T.purple, 'Connect them when you want', 'Run each product standalone — or link them, so an interview can be triggered from a pipeline card and the score flows back. Entirely optional.', <IntegrationCardMock key="f" />],
]

export default function Home() {
  const reduce = useReducedMotion()
  const words = ['Two', 'products.', 'One', 'mission:']
  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 148, paddingBottom: 84, background: 'linear-gradient(180deg,#F5F7FF, #fff)' }}>
        <div className="mk-blob" style={{ width: 460, height: 460, background: '#A78BFA', top: -120, left: -80 }} />
        <div className="mk-blob" style={{ width: 420, height: 420, background: '#60A5FA', top: -60, right: -100, animationDelay: '4s' }} />
        <div className="mk-blob" style={{ width: 300, height: 300, background: '#C4B5FD', bottom: -120, left: '40%', animationDelay: '8s' }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow>The AI-native hiring &amp; evaluation platform</Eyebrow></Reveal>
              <h1 className="mk-h1">
                <motion.span initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.07 } } }} style={{ display: 'inline' }}>
                  {words.map((w, i) => <motion.span key={i} variants={reduce ? {} : { h: { opacity: 0, y: 24 }, s: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'inline-block', marginRight: 13 }}>{w}</motion.span>)}
                </motion.span>
                <br /><GradientText>hire the right people, faster.</GradientText>
              </h1>
              <Reveal delay={0.3}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 540, margin: '22px 0 26px' }}>Levl1 Hire runs your entire pipeline as an AI-powered ATS and CRM. Levl1 Interviews evaluates candidates with autonomous AI voice interviews. Use either on its own — or connect them for a seamless flow from sourcing to shortlist.</p></Reveal>
              <Reveal delay={0.4}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="#how" variant="ghost">See how it works ↓</Button></div></Reveal>
            </div>
            {/* Two distinct, side-by-side product cards (not layered) */}
            <Reveal delay={0.2}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', color: T.violet, marginBottom: 6 }}>LEVL1 HIRE</div><KanbanMock /></div>
              <div><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', color: T.indigo, marginBottom: 6 }}>LEVL1 INTERVIEWS</div><ScorecardMock /></div>
            </div></Reveal>
          </div>

          {/* ROI fact-bar */}
          <Reveal delay={0.5}>
            <div className="mk-grid-2" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 56, background: '#fff', border: '1px solid #E7E9F5', borderRadius: 18, padding: '22px 20px', boxShadow: '0 24px 50px -30px rgba(30,27,75,0.3)' }}>
              {ROI.map(([n, pre, suf, label], i) => (
                <div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 800, color: T.ink }}><CountUp to={n} prefix={pre} suffix={suf} /></div><div style={{ fontSize: 12.5, color: T.slate, marginTop: 4, lineHeight: 1.35 }}>{label}</div></div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 12 }}>Indicative outcomes based on replacing manual first-round screening.</div>
          </Reveal>

          <motion.div animate={reduce ? {} : { y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ textAlign: 'center', marginTop: 40, fontSize: 22, color: '#94A3B8' }}>⌄</motion.div>
        </Container>
      </section>

      {/* TWO PRODUCTS */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 48 }}><Eyebrow>One platform, two products</Eyebrow><h2 className="mk-h2">Each delivers on its own.</h2></div></Reveal>
        <div className="mk-grid-2">
          <Reveal><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.violet}`, height: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.violet, letterSpacing: '0.1em' }}>LEVL1 HIRE</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 8px' }}>The hiring platform you run on.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 18 }}>An AI-powered ATS and CRM: jobs, AI-scored candidates, drag-and-drop pipelines, clients and deals — your day-to-day hiring, end to end.</p>
            <div style={{ marginBottom: 16 }}><KanbanMock /></div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.violet, marginBottom: 12 }}>✓ Use Levl1 Hire standalone</div>
            <Link href="/hire" style={{ fontSize: 15, fontWeight: 700, color: T.violet, textDecoration: 'none' }}>Explore Hire →</Link>
          </div></Reveal>
          <Reveal delay={0.1}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.indigo}`, height: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.indigo, letterSpacing: '0.1em' }}>LEVL1 INTERVIEWS</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 8px' }}>Autonomous first-round interviews that stand on their own.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 18 }}>30-min AI voice interviews · human-approved questions · identity verified · ranked, evidence-based reports — a complete evaluation engine.</p>
            <div style={{ marginBottom: 16 }}><ScorecardMock /></div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.indigo, marginBottom: 12 }}>✓ Use Levl1 Interviews standalone</div>
            <Link href="/interviews" style={{ fontSize: 15, fontWeight: 700, color: T.indigo, textDecoration: 'none' }}>Explore Interviews →</Link>
          </div></Reveal>
        </div>
        <Reveal><div style={{ textAlign: 'center', marginTop: 24, fontSize: 15, fontWeight: 600, color: T.purple }}>Better together — connect them when you&apos;re ready.</div></Reveal>
      </Container></section>

      {/* HOW IT WORKS */}
      <section id="how" className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 44 }}><Eyebrow>How it works</Eyebrow><h2 className="mk-h2">From open role to confident hire.</h2></div></Reveal>
        <Stagger><div className="mk-grid-2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['01', 'Open roles & source', 'Branded apply pages + import.'], ['02', 'AI-screen at scale', 'Every candidate evaluated.'], ['03', 'Ranked shortlists', 'Evidence-based, not gut feel.'], ['04', 'Place with confidence', 'Move fast, with the proof.']].map(([n, t, d]) => (
            <StaggerItem key={n}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 22, height: '100%' }}><div style={{ fontSize: 13, fontWeight: 800, color: T.purple }}>{n}</div><div style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 6px' }}>{t}</div><div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.5 }}>{d}</div></div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      {/* WHY LEVL1 — balanced, product-tagged feature rows */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 50 }}><Eyebrow>Why Levl1</Eyebrow><h2 className="mk-h2">Two products that are powerful alone — and seamless together.</h2></div></Reveal>
        {WHY.map(([tag, accent, title, body, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '44px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}>
              <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: accent, background: `${accent}14`, borderRadius: 99, padding: '4px 11px', marginBottom: 12 }}>{tag}</span>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p>
            </div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
          </div></Reveal>
        ))}
      </Container></section>

      {/* ENTERPRISE STRIP */}
      <section style={{ background: T.ink, padding: '72px 0' }}><Container style={{ textAlign: 'center' }}>
        <Reveal><h2 style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Built for scale and security.</h2>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {['SSO-ready', 'Role-based access', 'Data isolation', 'Audit trails', 'GDPR-aligned', 'Global-ready'].map((x) => <span key={x} style={{ fontSize: 13.5, fontWeight: 600, color: '#C7CCEA', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '8px 16px' }}>{x}</span>)}
        </div></Reveal>
      </Container></section>

      {/* BIG CTA */}
      <section className="mk-section" style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(120deg,#6D28D9,#4F46E5 55%,#2563EB)' }}>
        <Container style={{ position: 'relative' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>See Levl1 on your own roles.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}><Button href="/contact" variant="light">Book a demo</Button><Link href="/pricing" style={{ fontSize: 15, fontWeight: 600, color: '#fff', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', textDecoration: 'none' }}>View pricing</Link></div></Reveal>
        </Container>
      </section>
    </div>
  )
}
