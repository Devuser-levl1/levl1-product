'use client'

import { useId } from 'react'

// ── Consent checkbox (Screen-scoped) ───────────────────────────────────────
// Consent is a legal act, so the control must be obviously present and
// deliberately checked. A real <input type="checkbox"> drives it (keyboard,
// screen readers, form semantics) — visually hidden but covering the box — with
// a 22px high-contrast box drawn on top, a visible focus ring, and the WHOLE
// row (≥44px tall) as the click/tap target via the wrapping <label>.
// Never pre-check: callers own `checked`, which must start false.
// Colors are explicit (white box, dark text) so it stays legible whatever the
// OS color scheme — the Screen candidate pages render light in both modes —
// and Windows high-contrast mode is handled via forced-colors.

export function ConsentCheckbox({ checked, onChange, disabled, children, note }: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  children: React.ReactNode
  note?: React.ReactNode   // small status line under the text (e.g. "Consent recorded")
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="lv-consent" data-checked={checked} data-disabled={disabled || undefined}>
      <input id={id} type="checkbox" className="lv-consent-input" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span className="lv-consent-box" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="lv-consent-text">
        {children}
        {note && <span className="lv-consent-note">{note}</span>}
      </span>
      <style>{CSS}</style>
    </label>
  )
}

const CSS = `
.lv-consent { position: relative; display: flex; align-items: flex-start; gap: 12px; min-height: 44px; box-sizing: border-box;
  padding: 12px 14px; border: 1.5px solid #CBD5E1; border-radius: 12px; background: #FFFFFF; cursor: pointer; text-align: left;
  transition: border-color .15s, background .15s, box-shadow .15s; }
.lv-consent:hover { border-color: #818CF8; }
.lv-consent[data-checked="true"] { border-color: #4F46E5; background: #EEF2FF; }
.lv-consent[data-disabled] { cursor: default; }
.lv-consent-input { position: absolute; left: 6px; top: 6px; width: 44px; height: 44px; margin: 0; opacity: 0; cursor: inherit; }
.lv-consent-box { flex: 0 0 22px; width: 22px; height: 22px; margin-top: 1px; box-sizing: border-box; border: 2px solid #4F46E5;
  border-radius: 6px; background: #FFFFFF; color: transparent; display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s; }
.lv-consent[data-checked="true"] .lv-consent-box { background: #4F46E5; color: #FFFFFF; }
.lv-consent-input:focus-visible + .lv-consent-box { outline: 3px solid #A5B4FC; outline-offset: 2px; }
.lv-consent-text { font-size: 14px; line-height: 1.55; color: #1E293B; }
.lv-consent-text strong { color: #0F172A; }
.lv-consent-note { display: block; margin-top: 4px; font-size: 12.5px; font-weight: 600; color: #4F46E5; }
@media (forced-colors: active) { .lv-consent-box { border-color: CanvasText; } .lv-consent[data-checked="true"] .lv-consent-box { background: Highlight; color: HighlightText; } }
`
