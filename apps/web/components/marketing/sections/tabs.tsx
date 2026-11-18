'use client'
import { useId, useRef, useState } from 'react'

// Accessible tabs (WAI-ARIA): arrow keys / Home / End move between tabs.
// Panels are pre-rendered on the server and passed in; inactive ones are
// `hidden`, so all content stays in the HTML for search engines.
// Phones: the tabs share the width in a grid (up to 3 per row) and show
// `shortLabel` when given, so nothing scrolls sideways or runs off the edge.
export function Tabs({ tabs, label }: { tabs: { id: string; label: string; shortLabel?: string; panel: React.ReactNode }[]; label: string }) {
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
      <div role="tablist" aria-label={label} className={`grid border-b border-mk-line sm:flex sm:gap-1 sm:overflow-x-auto ${tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { refs.current[i] = el }} type="button" role="tab" id={`${uid}-t-${t.id}`}
            aria-selected={active === i} aria-controls={`${uid}-p-${t.id}`} tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
            className={`-mb-px min-h-[44px] min-w-0 whitespace-nowrap border-b-2 px-2 text-center text-[0.9rem] font-medium transition-colors sm:px-4 sm:text-[0.95rem] ${active === i ? 'border-mk-accent text-mk-accent-text' : 'border-transparent text-mk-muted hover:text-mk-ink'}`}>
            {t.shortLabel ? <><span className="sm:hidden">{t.shortLabel}</span><span className="hidden sm:inline">{t.label}</span></> : t.label}
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
