'use client'
import { useId, useRef, useState } from 'react'

// Accessible tabs (WAI-ARIA): arrow keys / Home / End move between tabs.
// Panels are pre-rendered on the server and passed in; inactive ones are
// `hidden`, so all content stays in the HTML for search engines.
export function Tabs({ tabs, label }: { tabs: { id: string; label: string; panel: React.ReactNode }[]; label: string }) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const uid = useId()

  function onKey(e: React.KeyboardEvent, i: number) {
    const n = tabs.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault(); setActive(next); refs.current[next]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="-mx-5 flex gap-1 overflow-x-auto border-b border-mk-line px-5 sm:mx-0 sm:px-0">
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { refs.current[i] = el }} type="button" role="tab" id={`${uid}-t-${t.id}`}
            aria-selected={active === i} aria-controls={`${uid}-p-${t.id}`} tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
            className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-4 text-[0.95rem] font-medium transition-colors ${active === i ? 'border-mk-accent text-mk-accent-text' : 'border-transparent text-mk-muted hover:text-mk-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`${uid}-p-${t.id}`} aria-labelledby={`${uid}-t-${t.id}`} hidden={active !== i} tabIndex={0}
          className="mk-menu-enter pt-10 focus:outline-none">
          {t.panel}
        </div>
      ))}
    </div>
  )
}
