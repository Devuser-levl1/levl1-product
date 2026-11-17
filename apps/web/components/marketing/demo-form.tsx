'use client'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { CONTACT_EMAIL } from '@/config/site'

// Book-a-demo form → POST /api/demo (stored as a DemoRequest, visible in
// /admin/demo-leads, and emailed to DEMO_LEADS_TO_EMAIL).
type HiringFor = 'my_company' | 'agency_clients'
const HIRING_FOR: { value: HiringFor; label: string }[] = [
  { value: 'my_company', label: 'My company' },
  { value: 'agency_clients', label: 'My agency’s clients' },
]

const field = 'mk-field'
const label = 'mb-1.5 block text-[0.85rem] font-medium text-mk-ink'

export function DemoForm() {
  const [f, setF] = useState({ name: '', email: '', company: '', role: '', hiringFor: '' as HiringFor | '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) { setErr('Please add your name and a valid work email.'); return }
    setState('sending'); setErr('')
    try {
      const r = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      if (!r.ok) throw new Error()
      setState('done')
    } catch {
      setErr(`Something went wrong. Email ${CONTACT_EMAIL} and we’ll reply quickly.`); setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div role="status" className="mk-card flex flex-col items-center p-10 text-center">
        <CheckCircle2 aria-hidden className="h-10 w-10 text-mk-accent-text" strokeWidth={1.6} />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Thanks, {f.name.trim().split(' ')[0]}.</h2>
        <p className="mt-2 max-w-sm text-mk-slate">We’ve got your request and will be in touch within one business day.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mk-card space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="d-name" className={label}>Name</label><input id="d-name" className={field} autoComplete="name" required value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label htmlFor="d-email" className={label}>Work email</label><input id="d-email" type="email" className={field} autoComplete="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div><label htmlFor="d-company" className={label}>Company</label><input id="d-company" className={field} autoComplete="organization" value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
        <div><label htmlFor="d-role" className={label}>Your role</label><input id="d-role" className={field} autoComplete="organization-title" value={f.role} onChange={(e) => set('role', e.target.value)} /></div>
      </div>
      <fieldset>
        <legend className={label}>I’m hiring for</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {HIRING_FOR.map((o) => (
            <label key={o.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-[0.95rem] transition-colors ${f.hiringFor === o.value ? 'border-mk-accent bg-mk-accent-soft text-mk-ink' : 'border-mk-line text-mk-slate hover:border-mk-muted/60'}`}>
              <input type="radio" name="hiringFor" value={o.value} checked={f.hiringFor === o.value} onChange={() => set('hiringFor', o.value)} className="h-4 w-4 accent-[#4F46E5]" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div><label htmlFor="d-msg" className={label}>Message <span className="font-normal text-mk-muted">(optional)</span></label>
        <textarea id="d-msg" rows={4} className={field} placeholder="What roles are you hiring for?" value={f.message} onChange={(e) => set('message', e.target.value)} /></div>
      {err && <p role="alert" className="text-[0.9rem] font-medium text-rose-600">{err}</p>}
      <button type="submit" disabled={state === 'sending'} className="mk-btn mk-btn-primary w-full disabled:opacity-70">{state === 'sending' ? 'Sending…' : 'Talk to us'}</button>
      <p className="text-center text-[0.8rem] text-mk-muted">See our <a href="/privacy" className="underline underline-offset-2 hover:text-mk-ink">Privacy Policy</a> for how we handle your details.</p>
    </form>
  )
}
