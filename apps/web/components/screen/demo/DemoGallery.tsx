'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Mic } from 'lucide-react'
import { DEMO_PERSONAS } from '@/lib/screen/demo/personas'
import { ConsentCheckbox } from '@/components/interviews/ConsentCheckbox'

// Embeddable demo gallery — rendered on /products/screen/demo inside the
// marketing site (styled with its mk.* tokens). One click → lead gate →
// /api/demo/start → live voice interview at /interview/[id]?demo=1.
export function DemoGallery() {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')
  // Lead-capture gate: which persona the prospect chose + their details.
  const [leadFor, setLeadFor] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  const chosen = DEMO_PERSONAS.find((p) => p.slug === leadFor)

  function openLead(slug: string, el: HTMLElement) { opener.current = el; setLeadFor(slug); setErr('') }
  function closeLead() { if (starting) return; setLeadFor(null); opener.current?.focus() }

  async function start() {
    if (starting || !leadFor) return
    if (!name.trim()) { setErr('Please enter your name.'); return }
    if (!email.trim()) { setErr('Please enter your work email.'); return }
    setStarting(true); setErr('')
    try {
      const res = await fetch('/api/demo/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: leadFor, name: name.trim(), email: email.trim(), marketingConsent: consent }) })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Couldn\'t start the demo. Please try again.'); setStarting(false); return }
      router.push(`/interview/${d.interviewId}?demo=1`)
    } catch { setErr('Network error — please try again.'); setStarting(false) }
  }

  return (
    <div id="try-live">
      <div className="grid gap-4 md:grid-cols-3">
        {DEMO_PERSONAS.map((p) => (
          <div key={p.slug} className="mk-card mk-card-hover flex flex-col p-6">
            <span className="mk-badge mk-badge-neutral w-fit">{p.category}</span>
            <h3 className="mt-4 text-[1.15rem] font-semibold tracking-tight text-mk-ink">{p.title}</h3>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-mk-slate">{p.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.skills.map((s) => <span key={s} className="rounded-md border border-mk-line px-2 py-0.5 text-[0.75rem] font-medium text-mk-slate">{s}</span>)}
            </div>
            <p className="mt-4 text-[0.82rem] text-mk-muted">~{p.durationMin} min · {p.accent} · {p.language}</p>
            <div className="mt-auto pt-6">
              <button type="button" onClick={(e) => openLead(p.slug, e.currentTarget)} className="mk-btn mk-btn-primary w-full">
                Try this interview<ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-[0.9rem] text-mk-muted">
        <Mic aria-hidden className="h-4 w-4" strokeWidth={2} />
        You’ll need a microphone — allow access when your browser asks.
      </p>
      <p className="mt-2 text-center text-[0.9rem] text-mk-muted">
        Evaluating for your team? <a href="/demo" className="font-medium text-mk-accent-text hover:underline">Talk to us</a>
      </p>

      {leadFor && chosen && (
        <LeadDialog
          title={chosen.title} minutes={chosen.durationMin}
          name={name} setName={setName} email={email} setEmail={setEmail}
          consent={consent} setConsent={setConsent}
          err={err} starting={starting} onStart={start} onClose={closeLead}
        />
      )}
    </div>
  )
}

// Lead-capture gate as a real modal dialog. Forced light (.mk-light) because
// ConsentCheckbox is light-only.
function LeadDialog({ title, minutes, name, setName, email, setEmail, consent, setConsent, err, starting, onStart, onClose }: {
  title: string; minutes: number
  name: string; setName: (v: string) => void; email: string; setEmail: (v: string) => void
  consent: boolean; setConsent: (v: boolean) => void
  err: string; starting: boolean; onStart: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Latest onClose without re-running the mount effect on every keystroke.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLInputElement>('input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('input, button')).filter((el) => !el.hasAttribute('disabled'))
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [])

  const label = 'mb-1.5 mt-4 block text-[0.82rem] font-medium text-mk-ink'
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="demo-gate-title" onClick={(e) => e.stopPropagation()}
        className="mk-light w-full max-w-[440px] rounded-xl border border-mk-line bg-mk-surface p-6 sm:p-7">
        <p className="text-[0.8rem] font-medium text-mk-muted">{title} · ~{minutes} min</p>
        <h2 id="demo-gate-title" className="mt-1 text-[1.2rem] font-semibold tracking-tight">Start your live interview</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-mk-slate">Tell us who you are and we’ll begin right away. You’ll get the evidence report at the end.</p>

        <label htmlFor="demo-name" className={label}>Name</label>
        <input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="mk-field" />
        <label htmlFor="demo-email" className={label}>Work email</label>
        <input id="demo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onStart() }} placeholder="you@company.com" autoComplete="email" className="mk-field" />
        <p className="mt-1.5 text-[0.78rem] text-mk-muted">Business email only — personal providers (Gmail, Outlook, etc.) aren’t supported.</p>

        <div className="mt-4">
          <ConsentCheckbox checked={consent} onChange={setConsent}>
            I agree that Levl1 may contact me about my demo results and its products. <span className="text-mk-muted">(Optional — you can still try the demo without this.)</span>
          </ConsentCheckbox>
        </div>

        <p className="mt-4 flex items-center gap-2 text-[0.82rem] text-mk-muted"><Mic aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />Allow microphone access when your browser asks.</p>

        {err && <p role="alert" className="mt-3 text-[0.88rem] font-medium text-rose-700">{err}</p>}

        <div className="mt-6 flex gap-2.5">
          <button type="button" onClick={onClose} disabled={starting} className="mk-btn mk-btn-secondary flex-1">Cancel</button>
          <button type="button" onClick={onStart} disabled={starting} className="mk-btn mk-btn-primary flex-[2] disabled:opacity-70">{starting ? 'Starting…' : 'Start interview'}</button>
        </div>
      </div>
    </div>
  )
}
