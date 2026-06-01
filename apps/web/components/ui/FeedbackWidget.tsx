'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Star } from 'lucide-react'
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
    pathname === '/login' ||
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
            background:   '#fff',
            border:       '1px solid #E2E8F0',
            borderRadius: 14,
            boxShadow:    '0 8px 40px rgba(79,70,229,0.14), 0 2px 8px rgba(0,0,0,0.08)',
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
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', fontFamily: 'var(--font-display)' }}>
              Share your feedback
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94A3B8', display: 'flex', padding: 2, borderRadius: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#475569' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8' }}
            >
              <X size={15} />
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
              <div style={{ fontSize: 28 }}>🙏</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5' }}>Thank you for your feedback!</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>It helps us improve Levl1 for you.</div>
            </div>
          ) : (
            <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Star rating */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
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
                        color: n <= stars ? '#F59E0B' : '#E2E8F0',
                        transition: 'color 0.12s, transform 0.12s',
                        transform: n <= stars ? 'scale(1.18)' : 'scale(1)',
                      }}
                    >
                      <Star
                        size={26}
                        fill={n <= stars ? '#F59E0B' : 'none'}
                        strokeWidth={n <= stars ? 0 : 1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Tell us more <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What could be better?"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px',
                    border: '1px solid #E2E8F0', borderRadius: 8,
                    fontSize: 13, color: '#4F46E5', fontFamily: 'var(--font-sans)',
                    resize: 'none', outline: 'none', background: '#F8FAFC',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0' }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!rating || sending}
                style={{
                  width: '100%', padding: '10px 0',
                  background: rating
                    ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                    : '#E2E8F0',
                  border:       'none',
                  borderRadius: 8,
                  color:        rating ? '#fff' : '#94A3B8',
                  fontSize:     13,
                  fontWeight:   600,
                  cursor:       rating ? 'pointer' : 'not-allowed',
                  fontFamily:   'var(--font-sans)',
                  transition:   'all 0.15s',
                  boxShadow:    rating ? '0 2px 8px rgba(124,58,237,0.22)' : 'none',
                }}
              >
                {sending ? 'Sending…' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpen}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          padding:      '10px 16px',
          background:   'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          border:       'none',
          borderRadius: 100,
          color:        '#fff',
          fontSize:     13,
          fontWeight:   600,
          cursor:       'pointer',
          fontFamily:   'var(--font-sans)',
          boxShadow:    '0 4px 18px rgba(124,58,237,0.35)',
          transition:   'box-shadow 0.18s, transform 0.18s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.50)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.35)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <MessageSquare size={15} />
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
