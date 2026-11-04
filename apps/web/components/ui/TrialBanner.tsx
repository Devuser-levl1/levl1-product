'use client'

import { Zap, X, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useState } from 'react'

export default function TrialBanner() {
  const { agencyPlan, setShowUpgradeWall } = useAppStore()
  const [dismissed, setDismissed] = useState(false)

  if (!agencyPlan || agencyPlan.plan !== 'trial' || dismissed) return null

  const { interviewsUsed, interviewsLimit, trialDaysLeft } = agencyPlan
  const remaining = interviewsLimit - interviewsUsed
  const pctUsed = interviewsUsed / interviewsLimit // 0–1

  // Color logic: red when exhausted or <2 days, amber when 4+ used or <7 days, else green
  let bg = 'color-mix(in srgb, var(--lv-success) 8%, transparent)'
  let border = 'color-mix(in srgb, var(--lv-success) 25%, transparent)'
  let text = 'var(--lv-success)'
  let accent = 'var(--lv-success)'
  let urgency = 'info'

  if (remaining === 0 || trialDaysLeft <= 2) {
    urgency = 'danger'
    bg = 'color-mix(in srgb, var(--lv-danger) 7%, transparent)'
    border = 'color-mix(in srgb, var(--lv-danger) 25%, transparent)'
    text = 'var(--lv-danger)'
    accent = 'var(--lv-danger)'
  } else if (remaining <= 1 || trialDaysLeft <= 7) {
    urgency = 'warn'
    bg = 'color-mix(in srgb, var(--lv-warning) 8%, transparent)'
    border = 'color-mix(in srgb, var(--lv-warning) 25%, transparent)'
    text = 'var(--lv-warning)'
    accent = 'var(--lv-warning)'
  }

  const label =
    remaining === 0
      ? 'Trial interviews exhausted'
      : `Trial: ${interviewsUsed} of ${interviewsLimit} interviews used · ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining`

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 0 16px',
        flexWrap: 'wrap',
      }}
    >
      <Zap size={14} color={accent} fill={accent} />

      {/* Progress bar + label */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: text, marginBottom: 4 }}>{label}</div>
        <div style={{ height: 4, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(pctUsed * 100, 100)}%`,
              background: accent,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Upgrade button */}
      <button
        onClick={() => setShowUpgradeWall(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: urgency === 'danger' ? 'var(--lv-danger)' : urgency === 'warn' ? 'var(--lv-warning)' : 'var(--lv-brand)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        <TrendingUp size={12} />
        Upgrade Now
      </button>

      {/* Dismiss (only for non-danger) */}
      {urgency !== 'danger' && (
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: text,
            padding: 2,
            display: 'flex',
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
