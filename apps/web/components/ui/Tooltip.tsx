'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: string
  position?: TooltipPosition
  children: React.ReactNode
  delay?: number  // ms before showing, default 400
  maxWidth?: number
}

export function Tooltip({
  content,
  position = 'top',
  children,
  delay = 400,
  maxWidth = 220,
}: TooltipProps) {
  const [visible, setVisible]     = useState(false)
  const [coords,  setCoords]      = useState({ top: 0, left: 0 })
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef   = useRef<HTMLSpanElement>(null)
  const tipRef    = useRef<HTMLDivElement>(null)

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const computeCoords = useCallback(() => {
    const wrap = wrapRef.current
    const tip  = tipRef.current
    if (!wrap) return

    const wr = wrap.getBoundingClientRect()
    const tw = tip?.offsetWidth  ?? maxWidth
    const th = tip?.offsetHeight ?? 36
    const gap = 8

    let top  = 0
    let left = 0

    switch (position) {
      case 'top':
        top  = wr.top  - th - gap + window.scrollY
        left = wr.left + wr.width / 2 - tw / 2 + window.scrollX
        break
      case 'bottom':
        top  = wr.bottom + gap + window.scrollY
        left = wr.left + wr.width / 2 - tw / 2 + window.scrollX
        break
      case 'left':
        top  = wr.top + wr.height / 2 - th / 2 + window.scrollY
        left = wr.left - tw - gap + window.scrollX
        break
      case 'right':
        top  = wr.top + wr.height / 2 - th / 2 + window.scrollY
        left = wr.right + gap + window.scrollX
        break
    }

    // Clamp horizontally so it never goes off-screen
    const vw = window.innerWidth
    left = Math.max(8, Math.min(left, vw - tw - 8))

    setCoords({ top, left })
  }, [position, maxWidth])

  const show = () => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      computeCoords()
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    clearTimer()
    setVisible(false)
  }

  useEffect(() => clearTimer, [])

  return (
    <>
      <span
        ref={wrapRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>

      {visible && (
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            position:     'fixed',
            top:          coords.top,
            left:         coords.left,
            zIndex:       9999,
            background:   '#1E293B',
            color:        '#F1F5F9',
            fontSize:     12,
            fontWeight:   500,
            lineHeight:   1.5,
            padding:      '6px 10px',
            borderRadius: 7,
            maxWidth,
            pointerEvents: 'none',
            boxShadow:    '0 4px 16px rgba(0,0,0,0.22)',
            animation:    'tooltip-fade 0.12s ease',
          }}
        >
          {content}
          {/* Arrow */}
          <div
            style={{
              position:   'absolute',
              width:      0,
              height:     0,
              ...arrowStyle(position),
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes tooltip-fade {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}

function arrowStyle(pos: TooltipPosition): React.CSSProperties {
  const base = 'transparent'
  const solid = '#1E293B'
  switch (pos) {
    case 'top':
      return { bottom: -5, left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${solid}` }
    case 'bottom':
      return { top: -5, left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `5px solid ${solid}` }
    case 'left':
      return { right: -5, top: '50%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `5px solid ${solid}` }
    case 'right':
      return { left: -5, top: '50%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: `5px solid ${solid}` }
    default:
      return {}
  }
  void base
}

/** Small "?" icon button that wraps a tooltip — use next to headings or labels */
export function HelpIcon({ content, position = 'top' }: { content: string; position?: TooltipPosition }) {
  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        aria-label="Help"
        style={{
          width:        18,
          height:       18,
          borderRadius: '50%',
          border:       '1.5px solid #CBD5E1',
          background:   '#F8FAFC',
          color:        '#94A3B8',
          fontSize:     10,
          fontWeight:   700,
          cursor:       'pointer',
          display:      'inline-flex',
          alignItems:   'center',
          justifyContent: 'center',
          lineHeight:   1,
          flexShrink:   0,
          transition:   'all 0.15s',
          padding:      0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#7C3AED'
          e.currentTarget.style.color       = '#7C3AED'
          e.currentTarget.style.background  = 'rgba(124,58,237,0.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#CBD5E1'
          e.currentTarget.style.color       = '#94A3B8'
          e.currentTarget.style.background  = '#F8FAFC'
        }}
      >
        ?
      </button>
    </Tooltip>
  )
}
