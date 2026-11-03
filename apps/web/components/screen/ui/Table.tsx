'use client'

// ── Table (Screen design system) ───────────────────────────────────────────
// Column-config table: sticky header, consistent cell padding, optional
// clickable rows (keyboard-activatable), numeric alignment, and built-in
// empty/loading states so every list behaves the same.

import { EmptyState, Skeleton } from './Status'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  numeric?: boolean
  width?: number | string
}

export function Table<T>({ columns, rows, rowKey, onRowClick, loading, empty, caption }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string
  onRowClick?: (row: T) => void; loading?: boolean; empty?: React.ReactNode; caption?: string
}) {
  if (!loading && rows.length === 0 && empty) return <>{empty}</>
  return (
    <div className="lv-table-wrap">
      <table className="lv-table">
        {caption && <caption className="lv-sr-only">{caption}</caption>}
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.numeric ? 'lv-num' : undefined} style={c.width ? { width: c.width } : undefined}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={`sk-${i}`}>{columns.map((c) => <td key={c.key}><Skeleton width={c.numeric ? 40 : '70%'} /></td>)}</tr>
              ))
            : rows.map((r) => (
                <tr key={rowKey(r)} data-clickable={onRowClick ? '' : undefined} tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r) } : undefined}>
                  {columns.map((c) => <td key={c.key} className={c.numeric ? 'lv-num' : undefined}>{c.render(r)}</td>)}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}

export { EmptyState }
