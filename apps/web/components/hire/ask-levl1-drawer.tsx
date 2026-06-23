'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

interface ProposalItem { id: string; name: string; detail?: string; sub?: string }
interface Proposal { actionType: string; title: string; note?: string; items: ProposalItem[]; payload: Record<string, unknown> }
interface Msg { id: number; role: 'user' | 'assistant'; text?: string; proposal?: Proposal; status?: 'pending' | 'approved' | 'cancelled' }

const CHIPS = ['Top candidates this week', 'Pipeline summary', 'Find 5 candidates for a job and add to pipeline', 'Move candidates scoring 80+ to Screening']
const OPEN_KEY = 'levl1.ask.open'

export function AskLevl1Drawer() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [ctxJob, setCtxJob] = useState<{ id: string; title: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  const nextId = () => ++idRef.current

  // Restore open state so it survives reloads (it already survives navigation,
  // since this lives in the persistent Hire layout).
  useEffect(() => { setOpen(localStorage.getItem(OPEN_KEY) === '1') }, [])
  useEffect(() => { localStorage.setItem(OPEN_KEY, open ? '1' : '0') }, [open])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy, open])

  // Context-awareness: detect a job detail page and fetch its title.
  useEffect(() => {
    const m = pathname?.match(/^\/hire\/jobs\/([^/]+)$/)
    const id = m?.[1]
    if (id && id !== 'new') {
      fetch(`/api/hire/jobs/${id}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.id) setCtxJob({ id: d.id, title: d.title }) }).catch(() => {})
    } else { setCtxJob(null) }
  }, [pathname])

  const apiHistory = useCallback(() => msgs.filter((m) => m.text).map((m) => ({ role: m.role, content: m.text as string })), [msgs])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setInput('')
    const history = apiHistory()
    setMsgs((m) => [...m, { id: nextId(), role: 'user', text: q }])
    setBusy(true)
    try {
      const res = await fetch('/api/hire/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, messages: history, context: ctxJob ? { jobId: ctxJob.id } : undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsgs((m) => [...m, { id: nextId(), role: 'assistant', text: d.error ?? 'Something went wrong.' }]); return }
      setMsgs((m) => [...m, { id: nextId(), role: 'assistant', text: d.answer, proposal: d.proposal, status: d.proposal ? 'pending' : undefined }])
    } catch {
      setMsgs((m) => [...m, { id: nextId(), role: 'assistant', text: 'Network error — please try again.' }])
    } finally { setBusy(false) }
  }

  async function approve(msgId: number, proposal: Proposal) {
    setBusy(true)
    try {
      const res = await fetch('/api/hire/assistant/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: proposal.payload }) })
      const d = await res.json().catch(() => ({}))
      setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, status: 'approved' } : x)))
      setMsgs((m) => [...m, { id: nextId(), role: 'assistant', text: res.ok ? `✓ ${d.summary}` : (d.error ?? 'Action failed.') }])
    } catch {
      setMsgs((m) => [...m, { id: nextId(), role: 'assistant', text: 'Action failed — please try again.' }])
    } finally { setBusy(false) }
  }
  function cancel(msgId: number) {
    setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, status: 'cancelled' } : x)))
    setMsgs((m) => [...m, { id: nextId(), role: 'assistant', text: 'Cancelled — nothing was changed.' }])
  }

  // Let other parts of the app (e.g. the dashboard "Ask Levl1" bar) open the
  // drawer and optionally fire a question: window.dispatchEvent(new CustomEvent('levl1:ask', { detail: { question } })).
  const askRef = useRef(ask)
  askRef.current = ask
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question
      setOpen(true)
      if (q) askRef.current(q)
    }
    window.addEventListener('levl1:ask', handler)
    return () => window.removeEventListener('levl1:ask', handler)
  }, [])

  return (
    <>
      {/* Floating launcher — available across the whole Hire app. */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open Ask Levl1"
          style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 70, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 800, fontSize: 14, background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)', boxShadow: '0 10px 28px rgba(109,40,217,0.35)' }}>
          ✨ Ask Levl1
        </button>
      )}

      {/* Right-side drawer overlay — does NOT reflow the page; full-screen on mobile. */}
      <div aria-hidden={!open} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 75,
        width: 'min(400px, 100vw)', background: '#fff', borderLeft: '1px solid #E2E8F0',
        boxShadow: '-12px 0 40px rgba(15,23,42,0.16)', display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(105%)', transition: 'transform .22s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#6D28D9' }}>✨ Ask Levl1</span>
          {ctxJob && <span title={`Context: ${ctxJob.title}`} style={{ fontSize: 11, fontWeight: 700, color: '#5B21B6', background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.18)', borderRadius: 100, padding: '2px 8px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctxJob.title}</span>}
          {msgs.length > 0 && <button onClick={() => setMsgs([])} style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>}
          <button onClick={() => setOpen(false)} aria-label="Close" style={{ marginLeft: msgs.length > 0 ? 6 : 'auto', fontSize: 20, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.length === 0 && (
            <div>
              <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>
                Ask about your pipeline, or tell me to act — e.g. <em>“find 5 candidates for the Java role and add to pipeline”</em>. I&apos;ll always show you a preview and wait for your approval before changing anything.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(ctxJob ? [`Find 5 candidates for ${ctxJob.title} and add to pipeline`, ...CHIPS.slice(0, 2)] : CHIPS).map((c) => (
                  <button key={c} onClick={() => ask(c)} style={{ fontSize: 12.5, fontWeight: 600, color: '#5B21B6', background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.18)', borderRadius: 100, padding: '6px 12px', cursor: 'pointer', textAlign: 'left' }}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
              {m.text && (
                <div style={{
                  maxWidth: '88%', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '10px 13px', borderRadius: 12,
                  ...(m.role === 'user' ? { background: '#6D28D9', color: '#fff', borderBottomRightRadius: 4 } : { background: '#F8FAFC', color: '#334155', border: '1px solid #F1F5F9', borderBottomLeftRadius: 4 }),
                }}>{m.text}</div>
              )}
              {m.proposal && (
                <div style={{ width: '100%', border: '1px solid #DDD6FE', background: '#FBFAFF', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '11px 13px', borderBottom: '1px solid #EDE9FE' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed action · needs approval</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', marginTop: 3 }}>{m.proposal.title}</div>
                    {m.proposal.note && <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{m.proposal.note}</div>}
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', padding: '8px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {m.proposal.items.map((it) => (
                      <div key={it.id} style={{ fontSize: 12.5 }}>
                        <div style={{ color: '#0F172A', fontWeight: 600 }}>{it.name}{it.detail ? <span style={{ color: '#94A3B8', fontWeight: 500 }}> · {it.detail}</span> : null}</div>
                        {it.sub && <div style={{ color: '#64748B', marginTop: 1, lineHeight: 1.5 }}>{it.sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, padding: '10px 13px', borderTop: '1px solid #EDE9FE' }}>
                    {m.status === 'pending' ? (
                      <>
                        <button onClick={() => approve(m.id, m.proposal!)} disabled={busy} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => cancel(m.id)} disabled={busy} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      </>
                    ) : (
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: m.status === 'approved' ? '#059669' : '#94A3B8' }}>{m.status === 'approved' ? '✓ Approved & executed' : 'Cancelled'}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {busy && <div style={{ fontSize: 13, color: '#6D28D9', fontWeight: 600 }}>✨ Levl1 is working…</div>}
        </div>

        <div style={{ borderTop: '1px solid #F1F5F9', padding: 12, display: 'flex', gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(input) }}
            placeholder="Ask or tell Levl1 to do something…"
            style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, outline: 'none' }} />
          <button onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Send"
            style={{ width: 42, borderRadius: 10, border: 'none', background: input.trim() ? '#6D28D9' : '#E2E8F0', color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default' }}>→</button>
        </div>
      </div>
    </>
  )
}
