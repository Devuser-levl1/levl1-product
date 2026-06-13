'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from './ui'

const LINKS = [['Platform', '/'], ['Hire', '/hire'], ['Interviews', '/interviews'], ['Roadmap', '/roadmap'], ['Pricing', '/pricing']]

export function MarketingNav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, transition: 'all .3s ease', background: solid ? 'rgba(255,255,255,0.8)' : 'transparent', backdropFilter: solid ? 'blur(16px)' : 'none', borderBottom: solid ? '1px solid rgba(15,16,32,0.08)' : '1px solid transparent' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: solid ? 60 : 72, display: 'flex', alignItems: 'center', gap: 20, transition: 'height .3s ease' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`, transform: 'rotate(45deg)' }} />
          <span style={{ fontWeight: 800, fontSize: 19, color: T.ink, letterSpacing: '-0.01em' }}>Levl1</span>
        </Link>
        <nav className="mk-desk" style={{ display: 'flex', gap: 4, marginLeft: 14 }}>
          {LINKS.map(([l, h]) => <Link key={h} href={h} style={{ fontSize: 14.5, fontWeight: 500, color: '#334155', textDecoration: 'none', padding: '8px 12px', borderRadius: 8 }}>{l}</Link>)}
        </nav>
        <div className="mk-desk" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/login" style={{ fontSize: 14.5, fontWeight: 500, color: '#334155', textDecoration: 'none' }}>Sign in</Link>
          <Link href="/contact" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: `linear-gradient(120deg, ${T.purple}, ${T.blue})`, padding: '9px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 8px 22px rgba(109,40,217,0.3)' }}>Book a demo</Link>
        </div>
        <button className="mk-mob" onClick={() => setOpen(true)} aria-label="Menu" style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: T.ink }}>☰</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: T.ink, zIndex: 200, padding: 24, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: 26, color: '#fff', cursor: 'pointer' }}>×</button>
            <motion.nav initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.06 } } }} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
              {[...LINKS, ['Sign in', '/login'], ['Book a demo', '/contact']].map(([l, h]) => (
                <motion.div key={h} variants={{ h: { opacity: 0, x: -20 }, s: { opacity: 1, x: 0 } }}>
                  <Link href={h} onClick={() => setOpen(false)} style={{ fontSize: 26, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '10px 0', display: 'block' }}>{l}</Link>
                </motion.div>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
