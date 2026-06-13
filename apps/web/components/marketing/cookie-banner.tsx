'use client'
import { useEffect, useState } from 'react'
import { T } from './ui'

export function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => { if (!localStorage.getItem('levl1_cookie_choice')) setShow(true) }, [])
  function choose(v: 'all' | 'essential') { localStorage.setItem('levl1_cookie_choice', v); setShow(false) }
  if (!show) return null
  return (
    <div style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 300, maxWidth: 560, margin: '0 auto', background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, boxShadow: '0 20px 50px rgba(15,16,32,0.18)', padding: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>We use essential cookies to run Levl1, and optional analytics cookies to improve it. You can decline non-essential cookies. See our <a href="/cookies" style={{ color: T.purple }}>Cookie Policy</a>.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => choose('essential')} style={{ fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Decline</button>
        <button onClick={() => choose('all')} style={{ fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 9, border: 'none', background: `linear-gradient(120deg, ${T.purple}, ${T.blue})`, color: '#fff', cursor: 'pointer' }}>Accept all</button>
      </div>
    </div>
  )
}
