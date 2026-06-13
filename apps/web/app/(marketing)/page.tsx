'use client'
import { Container, Reveal, Stagger, StaggerItem, CountUp, Button, Eyebrow, GradientText, T } from '@/components/marketing/ui'
import { KanbanMock, ScorecardMock, InterviewRoomMock, ApprovalMock, VerificationMock, DealPipelineMock } from '@/components/marketing/mocks'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

export default function Home() {
  const reduce = useReducedMotion()
  const words = ['Hire', 'the', 'right', 'people.']
  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 90, background: 'linear-gradient(180deg,#F5F7FF, #fff)' }}>
        <div className="mk-blob" style={{ width: 460, height: 460, background: '#A78BFA', top: -120, left: -80 }} />
        <div className="mk-blob" style={{ width: 420, height: 420, background: '#60A5FA', top: -60, right: -100, animationDelay: '4s' }} />
        <div className="mk-blob" style={{ width: 300, height: 300, background: '#C4B5FD', bottom: -120, left: '40%', animationDelay: '8s' }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow>The AI hiring &amp; evaluation platform</Eyebrow></Reveal>
              <h1 className="mk-h1">
                <motion.span initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08 } } }} style={{ display: 'inline' }}>
                  {words.map((w, i) => <motion.span key={i} variants={reduce ? {} : { h: { opacity: 0, y: 24 }, s: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'inline-block', marginRight: 14 }}>{w}</motion.span>)}
                </motion.span>
                <br /><GradientText>Ten times faster.</GradientText>
              </h1>
              <Reveal delay={0.3}><p style={{ fontSize: 19, color: T.slate, lineHeight: 1.6, maxWidth: 520, margin: '22px 0 30px' }}>Levl1 evaluates candidates with autonomous AI interviews and runs your entire hiring pipeline — so teams and agencies worldwide shortlist in days, not weeks, with evidence they can trust.</p></Reveal>
              <Reveal delay={0.4}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="#how" variant="ghost">See how it works ↓</Button></div></Reveal>
            </div>
            <div style={{ position: 'relative', minHeight: 360 }}>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} style={{ position: 'relative', zIndex: 2 }}><ScorecardMock /></motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} style={{ position: 'absolute', bottom: -36, left: -28, width: 230, zIndex: 3 }} className="mk-desk"><div style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 12, boxShadow: '0 24px 48px -20px rgba(30,27,75,0.35)', padding: 12 }}><div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>RANKED #1</div><div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Priya Nair · 91</div><div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>Strong Yes</div></div></motion.div>
            </div>
          </div>
          <motion.div animate={reduce ? {} : { y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ textAlign: 'center', marginTop: 56, fontSize: 22, color: '#94A3B8' }}>⌄</motion.div>
        </Container>
      </section>

      {/* STATS */}
      <section style={{ background: T.ink, padding: '52px 0' }}>
        <Container>
          <div className="mk-grid-2" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' }}>
            {[[10, '', 'x', 'faster screening'], [5, '<', ' days', 'to shortlist'], [30, '', '-min', 'AI interviews'], [100, '', '%', 'evidence-based scoring']].map(([n, pre, suf, label], i) => (
              <Reveal key={i} delay={i * 0.08}><div><div style={{ fontSize: 'clamp(32px,4vw,46px)', fontWeight: 800, color: '#fff' }}><CountUp to={n as number} prefix={pre as string} suffix={suf as string} /></div><div style={{ fontSize: 13.5, color: '#A9B0D6', marginTop: 4 }}>{label as string}</div></div></Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* TWO PRODUCTS */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 48 }}><Eyebrow>One platform, two products</Eyebrow><h2 className="mk-h2">Source and evaluate, in one stack.</h2></div></Reveal>
        <div className="mk-grid-2">
          <Reveal><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.violet}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.violet, letterSpacing: '0.1em' }}>LEVL1 HIRE</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 8px' }}>Your hiring pipeline, supercharged with AI.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 18 }}>ATS + CRM: jobs, AI-scored candidates, drag-and-drop pipelines, clients &amp; deals.</p>
            <div style={{ marginBottom: 18 }}><KanbanMock /></div>
            <Link href="/hire" style={{ fontSize: 15, fontWeight: 700, color: T.violet, textDecoration: 'none' }}>Explore Hire →</Link>
          </div></Reveal>
          <Reveal delay={0.1}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.indigo}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.indigo, letterSpacing: '0.1em' }}>LEVL1 INTERVIEWS</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 8px' }}>Autonomous interviews your stakeholders trust.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 18 }}>30-min AI voice interviews · human-approved questions · identity verified · ranked reports.</p>
            <div style={{ marginBottom: 18 }}><ScorecardMock /></div>
            <Link href="/interviews" style={{ fontSize: 15, fontWeight: 700, color: T.indigo, textDecoration: 'none' }}>Explore Interviews →</Link>
          </div></Reveal>
        </div>
      </Container></section>

      {/* HOW IT WORKS */}
      <section id="how" className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 44 }}><Eyebrow>How it works</Eyebrow><h2 className="mk-h2">From open role to confident hire.</h2></div></Reveal>
        <Stagger><div className="mk-grid-2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['01', 'Open roles & source', 'Branded apply pages + import.'], ['02', 'AI-screen at scale', 'Every candidate evaluated.'], ['03', 'Ranked shortlists', 'Evidence-based, not gut feel.'], ['04', 'Place with confidence', 'Sync results, move fast.']].map(([n, t, d]) => (
            <StaggerItem key={n}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 22, height: '100%' }}><div style={{ fontSize: 13, fontWeight: 800, color: T.purple }}>{n}</div><div style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 6px' }}>{t}</div><div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.5 }}>{d}</div></div></StaggerItem>
          ))}
        </div></Stagger>
      </Container></section>

      {/* WHY LEVL1 — feature rows */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 50 }}><Eyebrow>Why Levl1</Eyebrow><h2 className="mk-h2">Depth where it matters.</h2></div></Reveal>
        {[
          ['Autonomous AI interviews', 'Structured voice interviews across technical, scenario, behavioral and EQ — with a live code editor and whiteboard.', <InterviewRoomMock key="a" />],
          ['Human-in-the-loop trust', 'Your team approves every question bank, and clients approve the rubric — so results carry weight.', <ApprovalMock key="b" />],
          ['Evidence-based reports', 'Every score is tied to what the candidate actually said or did. Nothing inferred, nothing fabricated.', <ScorecardMock key="c" />],
          ['Identity & integrity', 'Email OTP, photo capture and a live integrity score surface concerns — the AI never auto-rejects.', <VerificationMock key="d" />],
          ['One pipeline, end to end', 'Sourcing, screening and a built-in CRM share one talent graph — no fragile integrations.', <DealPipelineMock key="e" />],
        ].map(([title, body, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '44px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}><h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>{title as string}</h3><p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body as string}</p></div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock as React.ReactNode}</div>
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
