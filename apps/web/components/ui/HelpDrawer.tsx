'use client'

import { useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import { getHelpTopic } from '@/lib/helpContent'

interface HelpDrawerProps {
  topicId: string | null
  onClose: () => void
}

export function HelpDrawer({ topicId, onClose }: HelpDrawerProps) {
  const topic = topicId ? getHelpTopic(topicId) : null

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,15,26,0.42)',
          zIndex: 800,
          opacity: topicId ? 1 : 0,
          pointerEvents: topicId ? 'auto' : 'none',
          transition: 'opacity 0.22s',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position:   'fixed',
          top:        0,
          right:      0,
          height:     '100vh',
          width:      320,
          background: '#fff',
          boxShadow:  '-4px 0 32px rgba(79,70,229,0.12)',
          zIndex:     801,
          display:    'flex',
          flexDirection: 'column',
          transform:  topicId ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            padding:    '18px 20px 16px',
            display:    'flex',
            alignItems: 'flex-start',
            gap:        12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={15} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.60)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              How it works
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>
              {topic?.title ?? 'Help'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none',
              borderRadius: 7, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Steps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
          {topic ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {topic.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                  {/* Connector line */}
                  {i < topic.steps.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 15, top: 32,
                        width: 2, height: 'calc(100% - 8px)',
                        background: 'linear-gradient(180deg, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.05) 100%)',
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Step number bubble */}
                  <div
                    style={{
                      width: 30, height: 30,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)',
                      border: '1.5px solid rgba(124,58,237,0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: '#7C3AED',
                      flexShrink: 0, zIndex: 1,
                    }}
                  >
                    {i + 1}
                  </div>

                  <div style={{ flex: 1, paddingBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', marginBottom: 4, marginTop: 5, fontFamily: 'var(--font-display)' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
                      {step.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94A3B8', fontSize: 13 }}>Select a help topic to view guidance.</div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #F1F5F9',
            padding:   '14px 20px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px 0',
              background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)',
              borderRadius: 8, color: '#7C3AED', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.13)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.07)' }}
          >
            Got it, close
          </button>
        </div>
      </div>
    </>
  )
}
