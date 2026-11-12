'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles, X } from 'lucide-react'
import { Alert, Badge, Button, Checkbox, Input } from '@/components/screen/ui'
import { RUBRIC_TIERS, TIER_INFO, snapshotOf, type RubricTier, type SelectedRubric, type RubricProbe } from '@/lib/screen/rubrics/types'
import { suggestRubrics, type SuggestInput } from '@/lib/screen/rubrics/suggest'

// ── Per-position rubric selection (Screen-scoped) ───────────────────────────
// The recruiter SELECTS rubrics from the library (active ones only) and tiers
// each as Must-have / Good-to-have / Add-on. JD-based suggestions are offered
// with a default tier and the reason they matched — nothing is selected
// silently. A running counter + preview rail group the selection by tier.

interface ActiveRubric {
  id: string; area: string; subSkill: string; proficientIn: string; ableTo: string; practices: string
  strong: string; weak: string; keywords: string[]; probes: RubricProbe[]; statement: string
}

const TIER_TONE: Record<RubricTier, 'brand' | 'info' | 'neutral'> = { must: 'brand', good: 'info', addon: 'neutral' }

export function RubricSelector({ value, onChange, context, disabled }: {
  value: SelectedRubric[]
  onChange: (v: SelectedRubric[]) => void
  context?: SuggestInput            // position skills / JD → suggestions
  disabled?: boolean
}) {
  const [lib, setLib] = useState<ActiveRubric[] | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    let alive = true
    fetch('/api/rubric-library?status=selectable', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => { if (alive) setLib(d.items ?? []) })
      .catch(() => { if (alive) setLib([]) })
    return () => { alive = false }
  }, [])

  const selected = useMemo(() => new Map(value.map((v) => [v.rubricId, v])), [value])
  const suggestions = useMemo(
    () => (lib && context ? suggestRubrics(context, lib).filter((s) => !selected.has(s.rubricId)) : []),
    [lib, context, selected],
  )
  const byId = useMemo(() => new Map((lib ?? []).map((r) => [r.id, r])), [lib])

  const add = (id: string, tier: RubricTier, source: 'jd' | 'manual') => {
    const r = byId.get(id)
    if (!r || selected.has(id)) return
    onChange([...value, snapshotOf(r, tier, source)])
  }
  const setTier = (id: string, tier: RubricTier) => onChange(value.map((v) => (v.rubricId === id ? { ...v, tier } : v)))
  const remove = (id: string) => onChange(value.filter((v) => v.rubricId !== id))
  const addAllSuggestions = () => {
    const extra = suggestions.flatMap((s) => { const r = byId.get(s.rubricId); return r ? [snapshotOf(r, s.tier, 'jd')] : [] })
    onChange([...value, ...extra])
  }

  const needle = q.trim().toLowerCase()
  const grouped = useMemo(() => {
    const m = new Map<string, ActiveRubric[]>()
    for (const r of lib ?? []) {
      if (needle && ![r.subSkill, r.area, ...r.keywords].some((t) => t.toLowerCase().includes(needle))) continue
      m.set(r.area, [...(m.get(r.area) ?? []), r])
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [lib, needle])

  if (lib && lib.length === 0 && value.length === 0) {
    return <Alert tone="info" title="No active rubrics yet">A workspace admin can review and activate rubrics in the Rubric library. Until then, the concept rubric and must-haves below still steer the interview.</Alert>
  }

  return (
    <div className="rs-wrap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        {suggestions.length > 0 && !disabled && (
          <div style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: 12, background: 'var(--lv-surface-sunken)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Sparkles size={14} aria-hidden="true" color="var(--lv-brand)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Suggested from your JD ({suggestions.length})</span>
              <Button size="sm" variant="tertiary" onClick={addAllSuggestions} style={{ marginLeft: 'auto' }}>Add all</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((s) => {
                const r = byId.get(s.rubricId)
                if (!r) return null
                return (
                  <div key={s.rubricId} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 200px', minWidth: 0, fontSize: 13, color: 'var(--lv-text)' }}>{r.subSkill} <span style={{ color: 'var(--lv-text-muted)', fontSize: 12 }}>· {s.reason}</span></span>
                    <Badge tone={TIER_TONE[s.tier]}>{TIER_INFO[s.tier].label}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => add(s.rubricId, s.tier, 'jd')}>Add</Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--lv-text-muted)' }} />
          <Input aria-label="Search rubrics" placeholder="Search rubrics" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        {!lib && <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>Loading the rubric library…</span>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
          {grouped.map(([area, rows]) => (
            <div key={area}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--lv-text-muted)', marginBottom: 6 }}>{area}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map((r) => {
                  const sel = selected.get(r.id)
                  return (
                    <div key={r.id} style={{ border: `1px solid ${sel ? 'var(--lv-brand)' : 'var(--lv-border)'}`, borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', background: 'var(--lv-surface)' }}>
                      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                        <Checkbox checked={!!sel} disabled={disabled} description={r.statement}
                          onChange={(on) => (on ? add(r.id, 'good', 'manual') : remove(r.id))}>
                          <span style={{ fontWeight: 600 }}>{r.subSkill}</span>
                        </Checkbox>
                      </div>
                      {sel && (
                        <div role="radiogroup" aria-label={`Tier for ${r.subSkill}`} className="lv-seg" style={{ flexShrink: 0 }}>
                          {RUBRIC_TIERS.map((t) => (
                            <button key={t} type="button" role="radio" aria-checked={sel.tier === t} disabled={disabled} onClick={() => setTier(r.id, t)}
                              className={`lv-seg__btn${sel.tier === t ? ' is-active' : ''}`}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--lv-border)', marginLeft: t === 'must' ? 0 : -1,
                                background: sel.tier === t ? 'var(--lv-brand)' : 'var(--lv-surface)', color: sel.tier === t ? 'var(--lv-on-brand, #fff)' : 'var(--lv-text-body)', cursor: disabled ? 'default' : 'pointer' }}>
                              {TIER_INFO[t].short}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {lib && grouped.length === 0 && <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>No rubrics match “{q}”.</span>}
        </div>
      </div>

      {/* Preview rail — grouped by tier */}
      <aside aria-label="Selected rubrics" style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: 12, position: 'sticky', top: 12, background: 'var(--lv-surface)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }} aria-live="polite">{value.length} skill{value.length === 1 ? '' : 's'} selected</div>
        {RUBRIC_TIERS.map((t) => {
          const rows = value.filter((v) => v.tier === t)
          return (
            <div key={t} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lv-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{TIER_INFO[t].label} ({rows.length})</div>
              <div style={{ fontSize: 11, color: 'var(--lv-text-muted)', margin: '2px 0 6px' }}>{TIER_INFO[t].effect}</div>
              {rows.length === 0 ? <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>None</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {rows.map((v) => (
                    <div key={v.rubricId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--lv-text)' }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${v.area} — ${v.statement}`}>{v.subSkill}</span>
                      {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${v.subSkill}`} onClick={() => remove(v.rubricId)}><X size={12} /></Button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {value.length > 0 && !value.some((v) => v.tier === 'must') && (
          <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '12px 0 0' }}>No must-haves yet — without one, no rubric can gate the verdict.</p>
        )}
      </aside>
      <style>{'@media (max-width: 760px) { .rs-wrap { grid-template-columns: 1fr !important; } }'}</style>
    </div>
  )
}
