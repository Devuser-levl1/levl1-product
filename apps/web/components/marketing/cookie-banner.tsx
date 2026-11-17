'use client'
import { useEffect, useState } from 'react'

export function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => { try { if (!localStorage.getItem('levl1_cookie_choice')) setShow(true) } catch { /* storage blocked */ } }, [])
  function choose(v: 'all' | 'essential') { try { localStorage.setItem('levl1_cookie_choice', v) } catch { /* ignore */ } setShow(false) }
  if (!show) return null
  return (
    <div role="region" aria-label="Cookie choices" className="mk-popover fixed inset-x-4 bottom-4 z-[300] mx-auto flex max-w-[560px] flex-wrap items-center gap-4 p-4">
      <p className="min-w-[220px] flex-1 text-[0.82rem] leading-relaxed text-mk-slate">We use essential cookies to run Levl1, and optional analytics cookies to improve it. You can decline non-essential cookies. See our <a href="/cookies" className="text-mk-accent-text underline underline-offset-2">Cookie Policy</a>.</p>
      <div className="flex gap-2">
        <button onClick={() => choose('essential')} className="mk-btn mk-btn-secondary !px-3 !py-2 !text-[0.82rem]">Decline</button>
        <button onClick={() => choose('all')} className="mk-btn mk-btn-primary !px-3 !py-2 !text-[0.82rem]">Accept all</button>
      </div>
    </div>
  )
}
