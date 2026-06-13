'use client'
import { useState } from 'react'
import { Container, Reveal, Eyebrow, T } from '@/components/marketing/ui'

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1px solid #E7E9F5', fontSize: 15, background: '#fff', outline: 'none' }

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', company: '', role: '', teamSize: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name || !f.email.includes('@')) { setErr('Please add your name and a valid email.'); return }
    setState('sending'); setErr('')
    try {
      const r = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      if (!r.ok) throw new Error()
      setState('done')
    } catch { setErr('Something went wrong — email hello@levl1.io and we’ll respond fast.'); setState('idle') }
  }

  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container style={{ maxWidth: 880 }}>
      <div className="mk-grid-2" style={{ gap: 48, alignItems: 'start' }}>
        <Reveal>
          <Eyebrow>Book a demo</Eyebrow>
          <h1 className="mk-h2">See Levl1 on your roles.</h1>
          <p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65, margin: '16px 0 24px' }}>Tell us a little about your team and we’ll set up a tailored walkthrough — Hire, Interviews, or both.</p>
          <div style={{ fontSize: 14, color: T.slate }}>Prefer email? <a href="mailto:hello@levl1.io" style={{ color: T.purple, fontWeight: 600 }}>hello@levl1.io</a></div>
        </Reveal>
        <Reveal delay={0.1}>
          {state === 'done' ? (
            <div style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 18, padding: 32, textAlign: 'center', boxShadow: '0 20px 40px -25px rgba(30,27,75,0.25)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Thanks, {f.name.split(' ')[0]}!</div>
              <p style={{ fontSize: 15, color: T.slate, marginTop: 8 }}>We’ve got your request and will be in touch within one business day.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 40px -25px rgba(30,27,75,0.25)' }}>
              <input style={inp} placeholder="Full name" value={f.name} onChange={(e) => set('name', e.target.value)} />
              <input style={inp} type="email" placeholder="Work email" value={f.email} onChange={(e) => set('email', e.target.value)} />
              <input style={inp} placeholder="Company" value={f.company} onChange={(e) => set('company', e.target.value)} />
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={inp} placeholder="Your role" value={f.role} onChange={(e) => set('role', e.target.value)} />
                <select style={inp} value={f.teamSize} onChange={(e) => set('teamSize', e.target.value)}><option value="">Team size</option>{['1–10', '11–50', '51–200', '200+'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <textarea style={{ ...inp, minHeight: 90 }} placeholder="What are you hiring for?" value={f.message} onChange={(e) => set('message', e.target.value)} />
              {err && <div style={{ fontSize: 13, color: '#DC2626' }}>{err}</div>}
              <button type="submit" disabled={state === 'sending'} className="mk-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', background: 'linear-gradient(120deg,#6D28D9,#4F46E5 60%,#2563EB)', boxShadow: '0 10px 30px rgba(109,40,217,0.35)' }}>{state === 'sending' ? 'Sending…' : 'Book a demo'}</button>
            </form>
          )}
        </Reveal>
      </div>
    </Container></section>
  )
}
