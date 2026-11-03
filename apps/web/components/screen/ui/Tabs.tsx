'use client'

import { useRef } from 'react'

// ── Tabs (Screen design system) ────────────────────────────────────────────
// Controlled tab list with proper ARIA (tablist/tab/aria-selected/controls)
// and roving focus (←/→/Home/End). Render the active panel yourself with
// <TabPanel id> so existing state/logic stays where it is.

export interface TabItem<K extends string> { key: K; label: React.ReactNode; count?: number; icon?: React.ReactNode }

export function Tabs<K extends string>({ items, value, onChange, label, idPrefix = 'lv-tab' }: {
  items: TabItem<K>[]; value: K; onChange: (k: K) => void; label: string; idPrefix?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (i: number) => { const n = (i + items.length) % items.length; refs.current[n]?.focus(); onChange(items[n].key) }
  return (
    <div role="tablist" aria-label={label} className="lv-tabs">
      {items.map((t, i) => {
        const selected = t.key === value
        return (
          <button key={t.key} ref={(el) => { refs.current[i] = el }} role="tab" type="button" className="lv-tab"
            id={`${idPrefix}-${t.key}`} aria-selected={selected} aria-controls={`${idPrefix}-panel-${t.key}`} tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(i + 1) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); move(i - 1) }
              else if (e.key === 'Home') { e.preventDefault(); move(0) }
              else if (e.key === 'End') { e.preventDefault(); move(items.length - 1) }
            }}>
            {t.icon}{t.label}{t.count !== undefined && <span className="lv-tab__count">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ tabKey, idPrefix = 'lv-tab', children }: { tabKey: string; idPrefix?: string; children: React.ReactNode }) {
  return <div role="tabpanel" id={`${idPrefix}-panel-${tabKey}`} aria-labelledby={`${idPrefix}-${tabKey}`} tabIndex={0} style={{ outline: 'none' }}>{children}</div>
}
