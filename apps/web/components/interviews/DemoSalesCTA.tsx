'use client'
import { useEffect, useState } from 'react'

// Persistent-but-non-intrusive conversion affordance for demo runs (Build 05).
// Self-gating: renders only when the URL carries ?demo=1, so it can be mounted
// unconditionally on the interview + report pages without affecting real runs.
// Reads the flag in an effect to avoid any SSR/hydration mismatch.
export function DemoSalesCTA({ label = 'Book a demo' }: { label?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try { setShow(new URLSearchParams(window.location.search).get('demo') === '1') } catch { /* ignore */ }
  }, [])
  if (!show) return null
  return (
    <a href="/contact" target="_blank" rel="noopener" className="no-print"
      style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 60, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 100, textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 8px 22px rgba(79,70,229,0.3)' }}>
      <span>💬</span> {label}
    </a>
  )
}
