'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// ── Modal + Drawer (Screen design system) ──────────────────────────────────
// One overlay implementation replacing the ~19 hand-built ones: portal to
// <body>, dialog semantics (role/aria-modal/labelledby), Esc + backdrop close,
// focus moved in on open, Tab trapped inside, focus restored on close, page
// scroll locked. Footer actions go in `footer` (use <ActionBar>: primary
// bottom-right).

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface OverlayProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  dismissible?: boolean          // Esc / backdrop / × close (default true)
  initialFocusRef?: React.RefObject<HTMLElement>
}

function useOverlayBehaviour(open: boolean, onClose: () => void, dismissible: boolean, panelRef: React.RefObject<HTMLDivElement>, initialFocusRef?: React.RefObject<HTMLElement>) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const panel = panelRef.current
      const target = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel
      target?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); onCloseRef.current() }
      if (e.key === 'Tab' && panelRef.current) {
        const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (!els.length) return
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open, dismissible, panelRef, initialFocusRef])
}

function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

function OverlayShell({ kind, size = 'md', ...p }: OverlayProps & { kind: 'modal' | 'drawer'; size?: 'sm' | 'md' | 'lg' }) {
  const { open, onClose, title, description, footer, children, dismissible = true, initialFocusRef } = p
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId(), descId = useId()
  const mounted = useMounted()
  useOverlayBehaviour(open, onClose, dismissible, panelRef, initialFocusRef)
  if (!open || !mounted) return null
  return createPortal(
    <div className={['lv-overlay', kind === 'drawer' && 'lv-overlay--drawer'].filter(Boolean).join(' ')}
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
        className={kind === 'drawer' ? 'lv-drawer' : `lv-modal lv-modal--${size}`}>
        <div className="lv-modal__head">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} className="lv-modal__title">{title}</h2>
            {description && <p id={descId} className="lv-modal__desc">{description}</p>}
          </div>
          {dismissible && (
            <button type="button" className="lv-btn lv-btn--ghost lv-btn--icon lv-btn--sm lv-modal__close" aria-label="Close" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="lv-modal__body">{children}</div>
        {footer && <div className="lv-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Modal(props: OverlayProps & { size?: 'sm' | 'md' | 'lg' }) { return <OverlayShell kind="modal" {...props} /> }
export function Drawer(props: OverlayProps) { return <OverlayShell kind="drawer" {...props} /> }
