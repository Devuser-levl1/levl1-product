'use client'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { CONTACT_EMAIL } from '@/config/site'

// Early-access capture for coming-soon products. Posts to the existing
// /api/demo (no API or schema change): leads land in /admin/demo-leads and
// the DEMO_LEADS_TO_EMAIL notification, tagged with the product name.
// `compact` is the one-line hero variant: name + work email + button.
export function EarlyAccessForm({ productName, compact = false }: { productName: string; compact?: boolean }) {
  const [f, setF] = useState({ name: '', email: '', company: '', role: '', note: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) { setErr('Please add your name and a valid work email.'); return }
    setState('sending'); setErr('')
    const message = [`Early access request: ${productName}`, f.note.trim()].filter(Boolean).join('\n\n')
    try {
      const r = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name, email: f.email, company: f.company, role: f.role, message }) })
      if (!r.ok) throw new Error()
      setState('done')
    } catch {
      setErr(`Something went wrong. Email ${CONTACT_EMAIL} and we’ll add you.`); setState('idle')
    }
  }

  if (state === 'done' && compact) {
    return (
      <p role="status" className="flex items-center gap-2 text-[0.95rem] font-medium text-mk-ink">
        <CheckCircle2 aria-hidden className="h-5 w-5 flex-none text-mk-accent-text" strokeWidth={1.8} />
        You’re on the list, {f.name.trim().split(' ')[0]}. We’ll be in touch as {productName} opens up.
      </p>
    )
  }

  if (compact) {
    return (
      <form onSubmit={submit} noValidate aria-label={`Get early access to ${productName}`} className="max-w-[34rem]">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_1.3fr_auto]">
          <label htmlFor="eac-name" className="sr-only">Name</label>
          <input id="eac-name" className="mk-field" placeholder="Name" autoComplete="name" required value={f.name} onChange={(e) => set('name', e.target.value)} />
          <label htmlFor="eac-email" className="sr-only">Work email</label>
          <input id="eac-email" type="email" className="mk-field" placeholder="Work email" autoComplete="email" required value={f.email} onChange={(e) => set('email', e.target.value)} />
          <button type="submit" disabled={state === 'sending'} className="mk-btn mk-btn-primary disabled:opacity-70">{state === 'sending' ? 'Sending…' : 'Notify me'}</button>
        </div>
        {err && <p role="alert" className="mt-2 text-[0.88rem] font-medium text-rose-600">{err}</p>}
      </form>
    )
  }

  if (state === 'done') {
    return (
      <div role="status" className="mk-card flex flex-col items-center p-10 text-center">
        <CheckCircle2 aria-hidden className="h-10 w-10 text-mk-accent-text" strokeWidth={1.6} />
        <h3 className="mt-4 text-xl font-semibold tracking-tight">You’re on the list, {f.name.trim().split(' ')[0]}.</h3>
        <p className="mt-2 max-w-sm text-mk-slate">We’ll be in touch as {productName} opens up to early-access teams.</p>
      </div>
    )
  }

  const label = 'mb-1.5 block text-[0.85rem] font-medium text-mk-ink'
  return (
    <form onSubmit={submit} noValidate className="mk-card space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="ea-name" className={label}>Name</label><input id="ea-name" className="mk-field" autoComplete="name" required value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label htmlFor="ea-email" className={label}>Work email</label><input id="ea-email" type="email" className="mk-field" autoComplete="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div><label htmlFor="ea-company" className={label}>Company</label><input id="ea-company" className="mk-field" autoComplete="organization" value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
        <div><label htmlFor="ea-role" className={label}>Your role</label><input id="ea-role" className="mk-field" autoComplete="organization-title" value={f.role} onChange={(e) => set('role', e.target.value)} /></div>
      </div>
      <div><label htmlFor="ea-note" className={label}>Anything we should know? <span className="font-normal text-mk-muted">(optional)</span></label>
        <textarea id="ea-note" rows={3} className="mk-field" placeholder="Roles, volume, what you’d want it to do" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
      {err && <p role="alert" className="text-[0.9rem] font-medium text-rose-600">{err}</p>}
      <button type="submit" disabled={state === 'sending'} className="mk-btn mk-btn-primary w-full disabled:opacity-70">{state === 'sending' ? 'Sending…' : 'Get early access'}</button>
      <p className="text-center text-[0.8rem] text-mk-muted">See our <a href="/privacy" className="underline underline-offset-2 hover:text-mk-ink">Privacy Policy</a> for how we handle your details.</p>
    </form>
  )
}
