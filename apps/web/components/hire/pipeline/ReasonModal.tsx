'use client'
import { useState } from 'react'

// Reason capture for candidate lifecycle actions (reject / delete). A reason is
// REQUIRED — confirm stays disabled until a preset is chosen or free text typed.
export function ReasonModal({ title, description, presets, confirmLabel, danger, onClose, onConfirm }: {
  title: string
  description?: string
  presets: readonly string[]
  confirmLabel: string
  danger?: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Free text (when present) wins over the chosen preset.
  const reason = freeText.trim() || picked || ''
  const confirmColor = danger ? '#DC2626' : '#6D28D9'

  async function confirm() {
    if (!reason) { setErr('Please choose or type a reason'); return }
    setSaving(true); setErr('')
    try {
      await onConfirm(reason)
    } catch (e) {
      setSaving(false); setErr(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, maxWidth: '100%' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{title}</div>
        {description && <div style={{ fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 1.5 }}>{description}</div>}

        <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '16px 0 8px' }}>Reason</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {presets.map((p) => {
            const active = picked === p && !freeText.trim()
            return (
              <button key={p} onClick={() => { setPicked(p); setFreeText(''); setErr('') }}
                style={{ padding: '7px 12px', borderRadius: 100, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? confirmColor : '#E2E8F0'}`, background: active ? `${confirmColor}10` : '#fff', color: active ? confirmColor : '#475569' }}>
                {p}
              </button>
            )
          })}
        </div>

        <input
          value={freeText}
          onChange={(e) => { setFreeText(e.target.value); setErr('') }}
          placeholder="Or type a custom reason…"
          style={{ marginTop: 12, width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
        />

        {err && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirm} disabled={saving || !reason} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: !reason ? '#E2E8F0' : confirmColor, color: !reason ? '#94A3B8' : '#fff', fontWeight: 700, cursor: saving || !reason ? 'default' : 'pointer' }}>{saving ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
