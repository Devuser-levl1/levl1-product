'use client'

import { INTERVIEW_MODES, MODE_LABEL, type InterviewMode } from '@/lib/screen/workspace/modes'

// Interview mode picker (Observe & Defend). `value` null = follow the
// JD-suggested mode; picking any option makes it an explicit HR override.
export function InterviewModeField({ value, suggested, onChange }: {
  value: InterviewMode | null
  suggested: InterviewMode
  onChange: (m: InterviewMode | null) => void
}) {
  const effective = value ?? suggested
  return (
    <div role="radiogroup" aria-label="Interview mode" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
      {INTERVIEW_MODES.map((m) => {
        const on = effective === m
        return (
          <button key={m} type="button" role="radio" aria-checked={on} onClick={() => onChange(m === suggested && value === null ? null : m)}
            style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: on ? 'var(--lv-brand-soft)' : 'var(--lv-surface)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>
              {MODE_LABEL[m].label}
              {m === suggested && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', border: '1px solid var(--lv-border)', borderRadius: 4, padding: '0 5px' }}>Suggested</span>}
            </span>
            <span style={{ fontSize: 12, color: 'var(--lv-text-muted)', lineHeight: 1.45 }}>{MODE_LABEL[m].hint}</span>
          </button>
        )
      })}
    </div>
  )
}
