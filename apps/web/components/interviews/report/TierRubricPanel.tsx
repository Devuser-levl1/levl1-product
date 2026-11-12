'use client'

import { CheckCircle2, CircleDashed, CircleMinus, XCircle } from 'lucide-react'
import { TIER_INFO, RUBRIC_TIERS, type RubricTier } from '@/lib/screen/rubrics/types'
import type { RubricAssessment, RubricRating } from '@/lib/screen/rubrics/scoring'

// ── Report: selected rubrics BY TIER (rubric library) ──────────────────────
// Must-have pass/fail at a glance, whether the verdict was capped (and why),
// then good-to-haves (score bonus) and add-ons (informational).

const RATING: Record<RubricRating, { label: string; fg: string; Icon: typeof CheckCircle2 }> = {
  met:          { label: 'Met',          fg: 'var(--lv-success)',    Icon: CheckCircle2 },
  partial:      { label: 'Partial',      fg: 'var(--lv-warning)',    Icon: CircleMinus },
  not_met:      { label: 'Not met',      fg: 'var(--lv-danger)',     Icon: XCircle },
  not_assessed: { label: 'Not assessed', fg: 'var(--lv-text-muted)', Icon: CircleDashed },
}
const VERDICT: Record<string, string> = { strong_yes: 'Strong yes', yes: 'Yes', maybe: 'Maybe', no: 'No' }

export function TierRubricPanel({ data }: { data: RubricAssessment | null | undefined }) {
  if (!data || !Array.isArray(data.items) || !data.items.length) return null
  const { items, gate } = data
  const must = items.filter((i) => i.tier === 'must')
  const mustMet = must.filter((i) => i.rating === 'met').length
  const mustTone = !must.length ? 'var(--lv-text-muted)' : gate.failedMust.length ? 'var(--lv-danger)' : mustMet === must.length ? 'var(--lv-success)' : 'var(--lv-warning)'

  return (
    <section aria-labelledby="tier-rubrics-h" style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 id="tier-rubrics-h" style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Role rubrics by tier</h3>
        {must.length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, color: mustTone, background: `color-mix(in srgb, ${mustTone} 10%, transparent)`, borderRadius: 100, padding: '4px 12px' }}>
            Must-haves {mustMet}/{must.length} met
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Selected from the rubric library · judged from the transcript</span>
      </div>
      {gate.capped && gate.from && gate.to ? (
        <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: '6px 0 14px', padding: '8px 10px', borderRadius: 6, background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)' }}>
          Verdict capped from <strong>{VERDICT[gate.from] ?? gate.from}</strong> to <strong>{VERDICT[gate.to] ?? gate.to}</strong> by the must-have rule. {gate.reasons.filter((r) => !r.startsWith('+')).join(' ')}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>
          {must.length ? (gate.failedMust.length || gate.weakMust.length || gate.unassessedMust.length ? gate.reasons.filter((r) => !r.startsWith('+')).join(' ') : 'Every must-have rubric was demonstrated.') : 'No must-have rubrics were selected for this position.'}
          {gate.goodBonus ? ` Good-to-have strengths added +${gate.goodBonus} to the score.` : ''}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {RUBRIC_TIERS.map((tier: RubricTier) => {
          const rows = items.filter((i) => i.tier === tier)
          if (!rows.length) return null
          return (
            <div key={tier}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--lv-text-muted)', marginBottom: 6 }}>
                {TIER_INFO[tier].label} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· {TIER_INFO[tier].effect}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map((r) => {
                  const st = RATING[r.rating] ?? RATING.not_assessed
                  return (
                    <div key={r.rubricId} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--lv-surface-muted)', borderRadius: 6 }}>
                      <st.Icon size={18} color={st.fg} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{r.subSkill} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--lv-text-muted)' }}>· {r.area}</span></div>
                        {r.evidence && <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 2, lineHeight: 1.5 }}>{r.evidence}</div>}
                      </div>
                      <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: st.fg, fontSize: 12 }}>{st.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
