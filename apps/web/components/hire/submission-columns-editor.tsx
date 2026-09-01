'use client'
import { SUBMISSION_COLUMN_CATALOG, columnLabel } from '@/lib/hire/submission-columns'

// Include/exclude + reorder the Excel summary columns. `value` is the ordered
// list of included keys; changes flow up via onChange.
export function SubmissionColumnsEditor({ value, onChange }: { value: string[]; onChange: (cols: string[]) => void }) {
  const included = value
  const available = SUBMISSION_COLUMN_CATALOG.filter((c) => !included.includes(c.key))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= included.length) return
    const next = [...included];[next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }
  const remove = (key: string) => onChange(included.filter((k) => k !== key))
  const add = (key: string) => { if (key && !included.includes(key)) onChange([...included, key]) }

  const chip: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', lineHeight: 1.4 }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {included.map((key, i) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', background: '#F8FAFC' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', width: 18 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{columnLabel(key)}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up" style={{ ...chip, opacity: i === 0 ? 0.4 : 1 }}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === included.length - 1} title="Move down" style={{ ...chip, opacity: i === included.length - 1 ? 0.4 : 1 }}>↓</button>
            <button type="button" onClick={() => remove(key)} title="Remove" style={{ ...chip, color: '#DC2626', borderColor: 'rgba(220,38,38,0.25)' }}>✕</button>
          </div>
        ))}
        {included.length === 0 && <div style={{ fontSize: 12.5, color: '#94A3B8', padding: '6px 0' }}>No columns selected — add at least one below.</div>}
      </div>
      {available.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>Add a column</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {available.map((c) => <button key={c.key} type="button" onClick={() => add(c.key)} style={{ ...chip, color: '#6D28D9', borderColor: 'rgba(109,40,217,0.3)' }}>+ {c.label}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}
