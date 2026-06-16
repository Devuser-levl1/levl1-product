'use client'
import { useState, useRef, useEffect } from 'react'

interface Msg { role: 'user' | 'assistant'; content: string }
const CHIPS = ['Top candidates this week', 'Stalling jobs', 'Pipeline summary', 'Best unreviewed candidates']

// "Ask Levl1" — prominent, premium entry point to chat-with-your-data (P0-6).
// Routes natural-language questions to /api/hire/assistant, which runs the
// existing Build-4 read-only tools against this tenant.
export function AskLevl1() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setOpen(true); setInput('')
    const next = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(next); setBusy(true)
    try {
      const res = await fetch('/api/hire/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, messages: next.slice(0, -1) }),
      })
      const d = await res.json().catch(() => ({}))
      setMsgs((m) => [...m, { role: 'assistant', content: res.ok ? (d.answer ?? '…') : (d.error ?? 'Something went wrong.') }])
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Network error — please try again.' }])
    } finally { setBusy(false) }
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ position: 'relative', background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)', borderRadius: 16, padding: 2, boxShadow: '0 8px 24px rgba(109,40,217,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: '4px 6px 4px 16px' }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(input) }}
            onFocus={() => setOpen(true)}
            placeholder="Ask Levl1 anything about your pipeline…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#0F172A', padding: '12px 0', background: 'transparent' }}
          />
          <button onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Ask"
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: input.trim() ? '#6D28D9' : '#E2E8F0', color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
            →
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {CHIPS.map((c) => (
          <button key={c} onClick={() => ask(c)} disabled={busy}
            style={{ fontSize: 12.5, fontWeight: 600, color: '#5B21B6', background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.18)', borderRadius: 100, padding: '6px 13px', cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      {open && (msgs.length > 0 || busy) && (
        <div style={{ marginTop: 14, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✨ Levl1 Assistant</span>
            <button onClick={() => { setMsgs([]); setOpen(false) }} style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          </div>
          <div ref={scrollRef} style={{ maxHeight: 360, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '10px 13px', borderRadius: 12,
                  ...(m.role === 'user'
                    ? { background: '#6D28D9', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#F8FAFC', color: '#334155', border: '1px solid #F1F5F9', borderBottomLeftRadius: 4 }),
                }}>{m.content}</div>
              </div>
            ))}
            {busy && <div style={{ fontSize: 13, color: '#6D28D9', fontWeight: 600 }}>✨ Levl1 is reading your data…</div>}
          </div>
        </div>
      )}
    </div>
  )
}
