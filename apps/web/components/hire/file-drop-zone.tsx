'use client'
import { useRef, useState } from 'react'
import { FILE_ACCEPT_ATTR, MAX_FILE_SIZE, validateUpload } from '@/lib/shared/file-constants'

const purple = '#6D28D9'

// Reusable drag-and-drop + click-to-browse file picker. Validates each file
// client-side (same rules the server enforces) and hands back only the valid
// ones. Single or multiple. Used by every candidate/JD upload surface so the
// drop behaviour + visual feedback are identical everywhere.
export function FileDropZone({ onFiles, multiple = false, disabled = false, busy = false, busyLabel = 'Reading…', hint, accept = FILE_ACCEPT_ATTR, compact = false }: {
  onFiles: (files: File[]) => void
  multiple?: boolean
  disabled?: boolean
  busy?: boolean
  busyLabel?: string
  hint?: string
  accept?: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const defaultHint = `PDF, Word (.doc/.docx), .txt or image · up to ${MAX_FILE_SIZE / 1024 / 1024}MB`

  function accepted(list: FileList | null): File[] {
    setError('')
    const all = Array.from(list ?? [])
    if (all.length === 0) return []
    const picked = multiple ? all : all.slice(0, 1)
    const valid: File[] = []
    const errors: string[] = []
    for (const f of picked) {
      const bad = validateUpload(f.name, f.size)
      if (bad) errors.push(bad); else valid.push(f)
    }
    if (errors.length) setError(errors.length === 1 ? errors[0] : `${errors.length} files rejected — ${errors[0]}`)
    return valid
  }

  function handle(list: FileList | null) {
    const valid = accepted(list)
    if (valid.length) onFiles(valid)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={disabled} onChange={(e) => handle(e.target.files)} style={{ display: 'none' }} />
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => { if (!disabled && !busy) inputRef.current?.click() }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled && !busy) { e.preventDefault(); inputRef.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !busy && !dragging) setDragging(true) }}
        onDragEnter={(e) => { e.preventDefault(); if (!disabled && !busy) setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (disabled || busy) return; handle(e.dataTransfer.files) }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: compact ? '16px 14px' : '24px 16px', borderRadius: 12, textAlign: 'center',
          cursor: disabled || busy ? 'default' : 'pointer',
          border: `2px dashed ${dragging ? purple : '#CBD5E1'}`,
          background: dragging ? 'rgba(109,40,217,0.06)' : '#FBFBFE',
          transition: 'border-color .12s ease, background .12s ease',
        }}
      >
        {busy ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>⏳ {busyLabel}</span>
        ) : dragging ? (
          <span style={{ fontSize: 14, fontWeight: 800, color: purple }}>Drop to upload</span>
        ) : (
          <>
            <span style={{ fontSize: 20 }}>⬆️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Drag &amp; drop {multiple ? 'resumes' : 'a file'} here, or <span style={{ color: purple }}>click to browse</span></span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{hint ?? defaultHint}</span>
          </>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</div>}
    </div>
  )
}
