'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
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
          position: 'fixed', inset: 0, background: 'var(--lv-overlay)',
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
          background: 'var(--lv-surface)',
          borderLeft: '1px solid var(--lv-border)',
          boxShadow:  'var(--lv-shadow-lg)',
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
            background: 'var(--lv-surface)',
            borderBottom: '1px solid var(--lv-border)',
            padding:    '16px 20px',
            display:    'flex',
            alignItems: 'flex-start',
            gap:        12,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', fontWeight: 500, marginBottom: 4 }}>
              How it works
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', lineHeight: 1.3, fontFamily: 'var(--lv-font-sans)' }}>
              {topic?.title ?? 'Help'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="lv-btn lv-btn--ghost lv-btn--icon lv-btn--sm"
            style={{ flexShrink: 0 }}
          >
            <X size={16} />
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
                        background: 'var(--lv-border)',
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Step number bubble */}
                  <div
                    style={{
                      width: 30, height: 30,
                      borderRadius: '50%',
                      background: 'var(--lv-surface)',
                      border: '1px solid var(--lv-border-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, color: 'var(--lv-text-body)',
                      flexShrink: 0, zIndex: 1,
                    }}
                  >
                    {i + 1}
                  </div>

                  <div style={{ flex: 1, paddingBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 4, marginTop: 5, fontFamily: 'var(--lv-font-sans)' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.65 }}>
                      {step.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--lv-text-muted)', fontSize: 13 }}>Select a help topic to view guidance.</div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid var(--lv-border)',
            padding:   '14px 20px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            className="lv-btn lv-btn--secondary lv-btn--full"
          >
            Got it, close
          </button>
        </div>
      </div>
    </>
  )
}
