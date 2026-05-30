'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

const DISMISS_KEY = 'levl1_install_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show,           setShow]           = useState(false)
  const [isIOS,          setIsIOS]          = useState(false)
  const [installed,      setInstalled]      = useState(false)

  useEffect(() => {
    /* Already dismissed or running as installed PWA */
    if (
      localStorage.getItem(DISMISS_KEY) ||
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      return
    }

    /* Detect iOS (Safari doesn't fire beforeinstallprompt) */
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    setIsIOS(ios)

    if (ios) {
      /* Show iOS instructions after 4 s on mobile */
      const t = setTimeout(() => setShow(true), 4000)
      return () => clearTimeout(t)
    }

    /* Chrome / Android — listen for the native install prompt */
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShow(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setShow(false)
  }

  if (!show || installed) return null

  return (
    <div
      style={{
        position:      'fixed',
        bottom:        'calc(72px + env(safe-area-inset-bottom))',
        left:          16,
        right:         16,
        zIndex:        200,
        background:    '#fff',
        borderRadius:  14,
        border:        '1px solid #E2E8F0',
        boxShadow:     '0 8px 32px rgba(79,70,229,0.18)',
        padding:       '14px 16px',
        display:       'flex',
        flexDirection: 'column',
        gap:           10,
        animation:     'fadeUp 0.3s ease',
        maxWidth:      440,
        margin:        '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Smartphone size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
            Add Levl1 to Home Screen
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            For the fastest interview experience
          </div>
        </div>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>

      {isIOS ? (
        /* iOS instructions */
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          Tap the <strong>Share</strong> button <span style={{ fontSize: 14 }}>⬆</span> in Safari,
          then choose <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
        </div>
      ) : (
        /* Android / Chrome native install button */
        <button
          onClick={install}
          style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          8,
            width:        '100%',
            padding:      '10px 0',
            background:   'linear-gradient(135deg,#4F46E5,#7C3AED)',
            border:       'none',
            borderRadius: 8,
            color:        '#fff',
            fontSize:     13,
            fontWeight:   700,
            cursor:       'pointer',
          }}
        >
          <Download size={15} />
          Install App
        </button>
      )}
    </div>
  )
}
