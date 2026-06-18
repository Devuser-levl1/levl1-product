'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEMO_PERSONAS, DEMO_CATEGORIES, DemoCategory } from '@/lib/screen/demo/personas'

const INDIGO = '#4F46E5'
const VIOLET = '#7C3AED'

export default function DemoGalleryPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<DemoCategory | 'All'>('All')
  const [starting, setStarting] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const shown = filter === 'All' ? DEMO_PERSONAS : DEMO_PERSONAS.filter((p) => p.category === filter)

  async function start(slug: string) {
    if (starting) return
    setStarting(slug); setErr('')
    try {
      const res = await fetch('/api/demo/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not start the demo.'); setStarting(null); return }
      router.push(`/interview/${d.interviewId}?demo=1`)
    } catch { setErr('Network error — please try again.'); setStarting(null) }
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'var(--font-sans)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: INDIGO, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.18)', borderRadius: 100, padding: '6px 14px', marginBottom: 16 }}>✨ Live demo · no signup</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Try a real AI interview in <span style={{ color: INDIGO }}>60 seconds</span></h1>
        <p style={{ fontSize: 16, color: '#64748B', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>Pick a technical role and start a live, voice-based screening instantly — no job description, no login. You&apos;ll get the full evidence report at the end.</p>
      </div>

      {/* Category filter (also a capability showcase) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {(['All', ...DEMO_CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 100, cursor: 'pointer', border: '1px solid ' + (filter === c ? INDIGO : '#E2E8F0'), background: filter === c ? 'rgba(79,70,229,0.08)' : '#fff', color: filter === c ? INDIGO : '#64748B' }}>{c}</button>
        ))}
      </div>

      {err && <div style={{ textAlign: 'center', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{err}</div>}

      {/* Gallery */}
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
            <button onClick={() => start(p.slug)} disabled={!!starting} style={{ marginTop: 'auto', width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: starting ? 'default' : 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, background: starting === p.slug ? VIOLET : `linear-gradient(135deg, ${INDIGO}, ${VIOLET})` }}>
              {starting === p.slug ? 'Starting…' : 'Try interview →'}
            </button>
          </div>
        ))}
      </div>

      {/* Conversion affordance */}
      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 14, color: '#64748B' }}>
        Evaluating for your team? <a href="/contact" style={{ color: INDIGO, fontWeight: 700 }}>Book a demo with our team →</a>
      </div>

      <style>{`.lv-demo-card { transition: transform .15s, box-shadow .15s, border-color .15s; } .lv-demo-card:hover { transform: translateY(-2px); border-color: #C7D2FE; box-shadow: 0 10px 28px rgba(79,70,229,0.10); }`}</style>
    </div>
  )
}
