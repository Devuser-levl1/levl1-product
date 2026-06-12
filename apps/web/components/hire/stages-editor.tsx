'use client'
import { useState } from 'react'

// Customisable pipeline stages. First and last stages cannot be removed.
export function StagesEditor({ stages, onChange }: { stages: string[]; onChange: (s: string[]) => void }) {
  const [adding, setAdding] = useState('')

  function rename(i: number, value: string) {
    const next = [...stages]; next[i] = value; onChange(next)
  }
  function remove(i: number) {
    if (i === 0 || i === stages.length - 1) return
    onChange(stages.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= stages.length) return
    const next = [...stages]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  function add() {
    const v = adding.trim()
    if (!v) return
    // Insert before the final stage so the last stage stays last.
    const next = [...stages]
    next.splice(stages.length - 1, 0, v)
    onChange(next); setAdding('')
  }

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, background: '#fff' }}>
      {stages.map((s, i) => {
        const locked = i === 0 || i === stages.length - 1
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < stages.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={arrowStyle(i === 0)}>▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === stages.length - 1} style={arrowStyle(i === stages.length - 1)}>▼</button>
            </div>
            <input value={s} onChange={(e) => rename(i, e.target.value)} style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 13 }} />
            {locked
              ? <span style={{ fontSize: 11, color: '#94A3B8', width: 64, textAlign: 'right' }}>{i === 0 ? 'first' : 'last'}</span>
              : <button type="button" onClick={() => remove(i)} style={{ width: 64, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>}
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="New stage name" style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 13 }} />
        <button type="button" onClick={add} style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 6, border: '1px solid #4F46E5', color: '#4F46E5', background: '#fff', cursor: 'pointer' }}>+ Add Stage</button>
      </div>
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>First and last stages cannot be removed. New stages are added before the final stage.</div>
    </div>
  )
}

function arrowStyle(disabled: boolean): React.CSSProperties {
  return { fontSize: 8, lineHeight: 1, padding: '1px 3px', border: 'none', background: 'none', color: disabled ? '#CBD5E1' : '#64748B', cursor: disabled ? 'default' : 'pointer' }
}
