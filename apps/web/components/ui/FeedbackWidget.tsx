'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Star, Check } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function FeedbackWidget() {
  const pathname              = usePathname()
  const [open, setOpen]       = useState(false)
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent]       = useState(false)
  const [sending, setSending] = useState(false)
  const panelRef              = useRef<HTMLDivElement>(null)

  // Hide on interview room, candidate pages, and landing page
  const hide =
    pathname === '/' ||
    pathname.startsWith('/interview/') ||
    pathname.startsWith('/candidate/') ||
    pathname === '/interviews/login' ||
    pathname === '/hire/login' ||
    pathname === '/signup'

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (hide) return null

  const reset = () => {
    setRating(0)
    setHovered(0)
    setComment('')
    setSent(false)
  }

  const handleOpen = () => { reset(); setOpen(true) }

  const handleSubmit = async () => {
    if (!rating) return
    setSending(true)
    try {
      await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment, page: pathname }),
      })
    } catch {}
    setSending(false)
    setSent(true)
    setTimeout(() => setOpen(false), 2000)
  }

  const stars = hovered || rating

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom:   80,
        right:    28,
        zIndex:   40,
        display:  'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap:      12,
      }}
    >
      {/* Popover */}
      {open && (
        <div
          style={{
            background:   'var(--lv-surface)',
            border:       '1px solid var(--lv-border)',
            borderRadius: 8,
            boxShadow:    '0 8px 40px color-mix(in srgb, var(--lv-brand) 14%, transparent), 0 2px 8px rgba(0,0,0,0.08)',
            width:        296,
            overflow:     'hidden',
            animation:    'feedback-pop 0.18s cubic-bezier(0.34,1.36,0.64,1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding:    '14px 16px 12px',
              borderBottom: '1px solid var(--lv-surface-muted)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-brand)', fontFamily: 'var(--lv-font-sans)' }}>
              Share your feedback
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--lv-text-muted)', display: 'flex', padding: 2, borderRadius: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--lv-text-body)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--lv-text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          {sent ? (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Check size={22} aria-hidden="true" style={{ color: 'var(--lv-success)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-brand)' }}>Thanks for your feedback</div>
              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>It helps us improve Levl1 for you.</div>
            </div>
          ) : (
            <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Star rating */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', marginBottom: 8 }}>
                  How is your experience?
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        color: n <= stars ? 'var(--lv-warning)' : 'var(--lv-border)',
                        transition: 'color 0.12s, transform 0.12s',
                        transform: n <= stars ? 'scale(1.18)' : 'scale(1)',
                      }}
                    >
                      <Star
                        size={26}
                        fill={n <= stars ? 'var(--lv-warning)' : 'none'}
                        strokeWidth={n <= stars ? 0 : 1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', marginBottom: 6 }}>
                  Tell us more <span style={{ color: 'var(--lv-text-muted)', fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What could be better?"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px',
                    border: '1px solid var(--lv-border)', borderRadius: 8,
                    fontSize: 13, color: 'var(--lv-brand)', fontFamily: 'var(--font-sans)',
                    resize: 'none', outline: 'none', background: 'var(--lv-surface-sunken)',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--lv-brand)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--lv-border)' }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!rating || sending}
                style={{
                  width: '100%', padding: '10px 0',
                  background: rating
                    ? 'var(--lv-gradient-brand)'
                    : 'var(--lv-border)',
                  border:       'none',
                  borderRadius: 8,
                  color:        rating ? '#fff' : 'var(--lv-text-muted)',
                  fontSize:     13,
                  fontWeight:   600,
                  cursor:       rating ? 'pointer' : 'not-allowed',
                  fontFamily:   'var(--font-sans)',
                  transition:   'all 0.15s',
                  boxShadow:    'none',
                }}
              >
                {sending ? 'Sending…' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating button — quiet secondary affordance (not a primary action) */}
      <button
        onClick={handleOpen}
        className="lv-btn lv-btn--secondary"
        style={{ borderRadius: 999, boxShadow: 'var(--lv-shadow-md)' }}
      >
        <MessageSquare size={14} />
        Feedback
      </button>

      <style>{`
        @keyframes feedback-pop {
          from { opacity: 0; transform: scale(0.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
