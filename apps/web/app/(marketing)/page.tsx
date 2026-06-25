'use client'
import { Container, Reveal, Stagger, StaggerItem, CountUp, Button, Eyebrow, GradientText, T } from '@/components/marketing/ui'
import { KanbanMock, ScorecardMock, InterviewRoomMock } from '@/components/marketing/mocks'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const PILLARS: [string, string, React.ReactNode][] = [
  ['Understand every candidate, instantly.', 'AI scores every résumé the moment it lands — even scanned and image PDFs — against a rubric you control.', <ScorecardMock key="a" />],
  ['Interview at scale, fairly.', 'Autonomous AI voice interviews run first rounds 24/7, with questions your team approves. Every candidate evaluated, not just the lucky few.', <InterviewRoomMock key="b" />],
  ['Run the whole pipeline, intelligently.', 'A complete ATS + CRM with AI matching, agentic actions, and a manager’s-eye view — lean where legacy tools are bloated.', <KanbanMock key="c" />],
]

const WHY: [string, string][] = [
  ['A real AI platform', 'Intelligence in every step, not a few buttons.'],
  ['You stay in control', 'AI proposes, humans approve. Always.'],
  ['Reads what others can’t', 'Scanned résumés, image PDFs, messy data.'],
  ['Lean by design', 'The power of legacy suites, none of the bloat or six-week onboarding.'],
  ['Works with your stack', 'ATS-agnostic; interviews plug into what you run.'],
]

export default function Home() {
  const reduce = useReducedMotion()
  return (
    <div>
      {/* 1 — HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 84, background: 'linear-gradient(180deg,#F5F7FF,#fff)' }}>
        <motion.div className="mk-blob" animate={reduce ? {} : { x: [0, 30, 0], y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 14 }} style={{ width: 480, height: 480, background: '#A78BFA', top: -130, left: -90 }} />
        <motion.div className="mk-blob" animate={reduce ? {} : { x: [0, -30, 0], y: [0, 24, 0] }} transition={{ repeat: Infinity, duration: 16 }} style={{ width: 440, height: 440, background: '#60A5FA', top: -70, right: -100 }} />
        <Container style={{ position: 'relative' }}>
          <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
            <div>
              <Reveal><Eyebrow>The AI hiring &amp; interview platform</Eyebrow></Reveal>
              <h1 className="mk-h1" style={{ marginTop: 6 }}>
                <motion.span initial={reduce ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ display: 'block' }}>Recruiting runs on guesswork and grunt work.</motion.span>
                <motion.span initial={reduce ? {} : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} style={{ display: 'inline-block', position: 'relative' }}>
                  <GradientText>Levl1 runs on intelligence.</GradientText>
                </motion.span>
              </h1>
              <Reveal delay={0.8}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 560, margin: '22px 0 24px' }}>Levl1 reads every résumé, scores every candidate, and interviews them for you — so your team spends its hours on people, not paperwork.</p></Reveal>
              <Reveal delay={0.95}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="#tension">See it in action →</Button><Button href="/contact" variant="ghost">Book a demo</Button></div></Reveal>
              <Reveal delay={1.05}><div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 16 }}>Built for recruitment agencies and in-house talent teams.</div></Reveal>
            </div>
            <Reveal delay={0.3}><ResumeToScore reduce={reduce} /></Reveal>
          </div>
        </Container>
      </section>

      {/* 2 — THE TENSION */}
      <section id="tension" style={{ background: T.ink, color: '#fff', padding: '92px 0', position: 'relative', overflow: 'hidden' }}><Container>
        <ResumeGrid reduce={reduce} />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(30px,5vw,52px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}><CountUp to={200} /> résumés. One role. Two days gone.</h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize: 17, color: '#C7CCEA', lineHeight: 1.7, marginTop: 20 }}>Your best candidate accepted another offer before anyone called her. The client re-screened your shortlist anyway. Multiply that by every open role, every week.</p></Reveal>
          <Reveal delay={0.2}><p style={{ fontSize: 'clamp(22px,3.2vw,32px)', fontWeight: 800, marginTop: 26 }}>That&apos;s not a people problem. <GradientText>It&apos;s a tooling problem.</GradientText></p></Reveal>
          <Reveal delay={0.3}><p style={{ fontSize: 14.5, color: '#8B93C0', marginTop: 16 }}>Every other industry automated its busywork. Recruiting got dashboards and called it innovation.</p></Reveal>
        </div>
      </Container></section>

      {/* 3 — THE RELEASE */}
      <section className="mk-section"><Container>
        <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>The AI does the work. <GradientText>Your team makes the decisions.</GradientText></h2></Reveal>
          <Reveal delay={0.1}><p style={{ fontSize: 17, color: T.slate, marginTop: 16 }}>Levl1 is a real AI platform — not an ATS with a few AI buttons bolted on.</p></Reveal>
        </div>
        <Reveal delay={0.15}><FlowDiagram reduce={reduce} /></Reveal>
      </Container></section>

      {/* 4 — THREE PILLARS */}
      <section className="mk-section" style={{ background: T.mist }}><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow>What it actually does</Eyebrow><h2 className="mk-h2">Three things, done intelligently.</h2></div></Reveal>
        {PILLARS.map(([title, body, mock], i) => (
          <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '44px 0' }}>
            <div style={{ order: i % 2 ? 2 : 1 }}>
              <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, color: i === 1 ? T.indigo : T.violet, marginBottom: 10 }}>{`0${i + 1}`}</span>
              <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p>
            </div>
            <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
          </div></Reveal>
        ))}
      </Container></section>

      {/* 5 — TWO PRODUCTS */}
      <section className="mk-section"><Container>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 40 }}><Eyebrow>Two products. One intelligence.</Eyebrow><h2 className="mk-h2">Two engines. One platform.</h2></div></Reveal>
        <div className="mk-grid-2" style={{ position: 'relative' }}>
          <motion.div initial={reduce ? {} : { opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.violet}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.violet, letterSpacing: '0.1em' }}>LEVL1 HIRE</div>
            <h3 style={{ fontSize: 21, fontWeight: 800, margin: '8px 0' }}>AI-native ATS + CRM.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 16 }}>Source, score, match, place — intelligence built in.</p>
            <div style={{ marginBottom: 16 }}><KanbanMock /></div>
            <Link href="/hire" style={{ fontSize: 15, fontWeight: 700, color: T.violet, textDecoration: 'none' }}>Explore Levl1 Hire →</Link>
          </motion.div>
          <motion.div initial={reduce ? {} : { opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 20, padding: 28, borderTop: `4px solid ${T.indigo}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.indigo, letterSpacing: '0.1em' }}>LEVL1 INTERVIEWS</div>
            <h3 style={{ fontSize: 21, fontWeight: 800, margin: '8px 0' }}>Autonomous AI voice interviews.</h3>
            <p style={{ fontSize: 15, color: T.slate, lineHeight: 1.6, marginBottom: 16 }}>Standalone, or on top of any ATS you already use.</p>
            <div style={{ marginBottom: 16 }}><ScorecardMock /></div>
            <Link href="/interviews" style={{ fontSize: 15, fontWeight: 700, color: T.indigo, textDecoration: 'none' }}>Explore Levl1 Interviews →</Link>
          </motion.div>
        </div>
        <Reveal delay={0.2}><div style={{ textAlign: 'center', marginTop: 22, fontSize: 15, fontWeight: 600, color: T.purple }}>Use either alone. Use both, and they work as one.</div></Reveal>
      </Container></section>

      {/* 6 — WHY LEVL1 */}
      <section className="mk-section" style={{ background: T.mist }}><Container style={{ maxWidth: 760 }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 32 }}><Eyebrow>Why Levl1</Eyebrow><h2 className="mk-h2">Built like an AI product, not a bolt-on.</h2></div></Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {WHY.map(([t, b], i) => (
            <motion.div key={t} initial={reduce ? {} : { opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, padding: '16px 20px' }}>
              <motion.span initial={reduce ? {} : { scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 400, damping: 16, delay: i * 0.1 + 0.15 }} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${T.violet}, ${T.indigo})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>✓</motion.span>
              <div><span style={{ fontSize: 15.5, fontWeight: 800, color: T.ink }}>{t}</span> <span style={{ fontSize: 14.5, color: T.slate }}>— {b}</span></div>
            </motion.div>
          ))}
        </div>
      </Container></section>

      {/* 7 — CLOSING CTA */}
      <section className="mk-section" style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(120deg,#6D28D9,#4F46E5 55%,#2563EB)' }}>
        <Container style={{ position: 'relative' }}>
          <Reveal><h2 style={{ fontSize: 'clamp(28px,4.2vw,48px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', maxWidth: 780, marginInline: 'auto' }}>See what hiring feels like when the busywork is gone.</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 14 }}>A short demo on your real roles. We&apos;ll show you, not tell you.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}><Button href="/contact" variant="light">Book a demo</Button><Link href="/contact" style={{ fontSize: 15, fontWeight: 600, color: '#fff', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', textDecoration: 'none' }}>Talk to us</Link></div></Reveal>
        </Container>
      </section>
    </div>
  )
}

/* ── Bespoke motion pieces ─────────────────────────────────────── */

// Hero: a raw résumé that transforms into a scored 0–100 card, on loop.
function ResumeToScore({ reduce }: { reduce: boolean | null }) {
  return (
    <div style={{ position: 'relative', minHeight: 280 }}>
      <motion.div animate={reduce ? {} : { opacity: [1, 1, 0, 0, 1], filter: ['blur(0px)', 'blur(0px)', 'blur(4px)', 'blur(4px)', 'blur(0px)'] }} transition={{ repeat: Infinity, duration: 6, times: [0, 0.35, 0.45, 0.95, 1] }} style={{ position: 'absolute', inset: 0, background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 20, boxShadow: '0 24px 50px -30px rgba(30,27,75,0.3)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' }}>RAW RÉSUMÉ</div>
        {[90, 70, 80, 55, 75, 60].map((w, i) => <div key={i} style={{ height: 9, borderRadius: 4, background: '#EEF0FA', width: `${w}%`, marginTop: 12 }} />)}
      </motion.div>
      <motion.div animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 6, times: [0, 0.4, 0.5, 0.9, 1] }} style={{ position: 'absolute', inset: 0, background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 20, boxShadow: '0 24px 50px -30px rgba(30,27,75,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#059669' }}>87</div>
          <div><div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Priya Nair</div><div style={{ fontSize: 12, color: '#64748B' }}>Senior Backend Engineer</div></div>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.1)', borderRadius: 100, padding: '3px 9px' }}>Strong fit</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {[['Java', 1], ['Kafka', 1], ['Spring', 1], ['Kubernetes', 0], ['AWS', 1]].map(([s, ok]) => (
            <span key={s as string} style={{ fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '3px 10px', color: ok ? '#059669' : '#B45309', background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)' }}>{ok ? '✓' : '○'} {s}</span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 14, lineHeight: 1.5, fontStyle: 'italic' }}>“9 yrs backend; led sharding of a write-heavy service.”</div>
      </motion.div>
    </div>
  )
}

// Tension: a wall of faint résumé thumbnails flooding in.
function ResumeGrid({ reduce }: { reduce: boolean | null }) {
  const cells = Array.from({ length: 60 })
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 8, padding: 24, opacity: 0.5 }}>
      {cells.map((_, i) => (
        <motion.div key={i} initial={reduce ? { opacity: 0.12 } : { opacity: 0, scale: 0.8 }} whileInView={{ opacity: i === 22 ? 0.5 : 0.12, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: (i % 12) * 0.02 + Math.floor(i / 12) * 0.03 }}
          style={{ height: 40, borderRadius: 5, background: i === 22 ? '#8B5CF6' : 'rgba(255,255,255,0.18)' }} />
      ))}
    </div>
  )
}

// Release: inputs → glowing core → outputs.
function FlowDiagram({ reduce }: { reduce: boolean | null }) {
  const inputs = ['Résumés', 'Emails', 'Job specs']
  const outputs = ['Scored candidates', 'Interviews', 'Shortlists']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px,4vw,40px)', marginTop: 44, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{inputs.map((x) => <div key={x} style={{ fontSize: 13, fontWeight: 600, color: '#64748B', background: '#fff', border: '1px solid #E7E9F5', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>{x}</div>)}</div>
      <div style={{ fontSize: 22, color: '#CBD5E1' }}>→</div>
      <motion.div animate={reduce ? {} : { boxShadow: ['0 0 40px rgba(124,58,237,0.35)', '0 0 70px rgba(79,70,229,0.55)', '0 0 40px rgba(124,58,237,0.35)'] }} transition={{ repeat: Infinity, duration: 3 }} style={{ width: 130, height: 130, borderRadius: 24, background: `linear-gradient(135deg, ${T.violet}, ${T.indigo})`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Levl1</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>intelligence core</div>
      </motion.div>
      <div style={{ fontSize: 22, color: '#CBD5E1' }}>→</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{outputs.map((x) => <div key={x} style={{ fontSize: 13, fontWeight: 700, color: T.ink, background: '#fff', border: `1px solid ${T.violet}33`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>{x}</div>)}</div>
    </div>
  )
}
