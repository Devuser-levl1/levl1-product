'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEMO_PERSONAS, DEMO_CATEGORIES, DemoCategory } from '@/lib/screen/demo/personas'

const INDIGO = '#4F46E5'
const VIOLET = '#7C3AED'

// Embeddable demo gallery (Build 05). Lives inside /interviews. One click →
// /api/demo/start → live Screen voice interview (no JD, no login).
export function DemoGallery() {
  const router = useRouter()
  const [filter, setFilter] = useState<DemoCategory | 'All'>('All')
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')
  // Lead-capture gate: which persona the prospect chose + their details.
  const [leadFor, setLeadFor] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)

  const shown = filter === 'All' ? DEMO_PERSONAS : DEMO_PERSONAS.filter((p) => p.category === filter)
  const chosen = DEMO_PERSONAS.find((p) => p.slug === leadFor)

  function openLead(slug: string) { setLeadFor(slug); setErr('') }

  async function start() {
    if (starting || !leadFor) return
    if (!name.trim()) { setErr('Please enter your name.'); return }
    if (!email.trim()) { setErr('Please enter your work email.'); return }
    setStarting(true); setErr('')
    try {
      const res = await fetch('/api/demo/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: leadFor, name: name.trim(), email: email.trim(), marketingConsent: consent }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not start the demo.'); setStarting(false); return }
      router.push(`/interview/${d.interviewId}?demo=1`)
    } catch { setErr('Network error — please try again.'); setStarting(false) }
  }

  return (
    <div id="try-live" style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 24px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: INDIGO, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.18)', borderRadius: 100, padding: '6px 14px', marginBottom: 14 }}>✨ Live demo · no signup</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Try a real AI interview in <span style={{ color: INDIGO }}>60 seconds</span></h2>
        <p style={{ fontSize: 16, color: '#64748B', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>Pick a technical role and start a live, voice-based screening instantly — no job description, no login. You&apos;ll get the full evidence report at the end.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 26 }}>
        {(['All', ...DEMO_CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 100, cursor: 'pointer', border: '1px solid ' + (filter === c ? INDIGO : '#E2E8F0'), background: filter === c ? 'rgba(79,70,229,0.08)' : '#fff', color: filter === c ? INDIGO : '#64748B' }}>{c}</button>
        ))}
      </div>

      {err && <div style={{ textAlign: 'center', color: '#DC2626', fontSize: 13.5, marginBottom: 16, fontWeight: 600 }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {shown.map((p) => (
          <div key={p.slug} className="lv-demo-card" style={{ display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: VIOLET, background: 'rgba(124,58,237,0.08)', borderRadius: 6, padding: '2px 8px' }}>{p.category}</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>{p.title}</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px', lineHeight: 1.5, minHeight: 38 }}>{p.blurb}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {p.skills.map((s) => <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 100, padding: '3px 10px' }}>{s}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
              <span>⏱ ~{p.durationMin} min</span>
              <span>🎙 {p.accent}</span>
              <span>{p.language}</span>
            </div>
            <button onClick={() => openLead(p.slug)} style={{ marginTop: 'auto', width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})` }}>
              Try interview →
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: '#64748B' }}>
        Evaluating for your team? <a href="/contact" style={{ color: INDIGO, fontWeight: 700 }}>Book a demo with our team →</a>
      </div>

      {/* Lead-capture gate — name + work email before the demo starts. */}
      {leadFor && (
        <div onClick={() => !starting && setLeadFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 16, padding: 26 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{chosen?.title} · ~{chosen?.durationMin} min</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Start your live interview</h3>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 18px' }}>Tell us who you are and we&apos;ll begin right away. You&apos;ll get the full evidence report at the end.</p>

            <label style={lbl}>Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inp} />
            <label style={lbl}>Work email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') start() }} placeholder="you@company.com" style={inp} />
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 5 }}>Business email only — personal providers (Gmail, Outlook, etc.) aren&apos;t supported.</div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, fontSize: 12.5, color: '#475569', lineHeight: 1.55, cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree that Levl1 may contact me about my demo results and its products. (Optional — you can still try the demo without this.)</span>
            </label>

            {err && <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginTop: 10 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setLeadFor(null)} disabled={starting} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={start} disabled={starting} style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: starting ? 'default' : 'pointer', background: starting ? VIOLET : `linear-gradient(135deg, ${INDIGO}, ${VIOLET})` }}>{starting ? 'Starting…' : 'Start interview →'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.lv-demo-card { transition: transform .15s, box-shadow .15s, border-color .15s; } .lv-demo-card:hover { transform: translateY(-2px); border-color: #C7D2FE; box-shadow: 0 10px 28px rgba(79,70,229,0.10); }`}</style>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', margin: '12px 0 5px' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none' }
