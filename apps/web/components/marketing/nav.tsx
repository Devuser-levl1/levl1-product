'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from './ui'

// Non-product top-level links. Hire/Interviews live under the Products dropdown.
const LINKS: [string, string][] = [['Platform', '/'], ['Roadmap', '/roadmap'], ['Pricing', '/pricing']]

const PRODUCTS: { name: string; href: string; desc: string }[] = [
  { name: 'Levl1 Hire', href: '/hire', desc: 'ATS, CRM & AI screening — run your entire hiring pipeline in one workspace.' },
  { name: 'Levl1 Screen', href: '/interviews', desc: 'Autonomous AI voice interviews with evidence-based scorecards, at scale.' },
]
const SIGN_IN_OPTIONS: { name: string; href: string; desc: string }[] = [
  { name: 'Levl1 Hire', href: '/hire/login', desc: 'Recruiters & Levl1 staff — your hiring workspace & platform console.' },
  { name: 'Levl1 Screen', href: '/interviews/login', desc: 'Manage AI interviews, candidates & scorecards.' },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

export function MarketingNav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<'products' | 'signin' | null>(null)
  const pathname = usePathname()
  const onHire = pathname === '/hire' || pathname.startsWith('/hire/')
  const productsActive = isActive(pathname, '/hire') || isActive(pathname, '/interviews')

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  const samePage = (href: string) => (e: React.MouseEvent) => {
    if (isActive(pathname, href)) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setOpen(false) }
  }

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, transition: 'all .3s ease', background: solid ? 'rgba(255,255,255,0.8)' : 'transparent', backdropFilter: solid ? 'blur(16px)' : 'none', borderBottom: solid ? '1px solid rgba(15,16,32,0.08)' : '1px solid transparent' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: solid ? 60 : 72, display: 'flex', alignItems: 'center', gap: 20, transition: 'height .3s ease' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`, transform: 'rotate(45deg)' }} />
          <span style={{ fontWeight: 800, fontSize: 19, color: T.ink, letterSpacing: '-0.01em' }}>Levl1</span>
        </Link>
        <nav className="mk-desk" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 14 }}>
          {/* Platform */}
          {(() => { const h = '/'; const active = isActive(pathname, h); return (
            <Link href={h} onClick={samePage(h)} aria-current={active ? 'page' : undefined} className="mk-navlink" style={{ fontSize: 14.5, fontWeight: active ? 700 : 500, color: active ? T.purple : '#334155', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, background: active ? 'rgba(109,40,217,0.08)' : 'transparent' }}>Platform</Link>
          ) })()}

          {/* Products mega-dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === 'products' ? null : 'products')) }} aria-haspopup="menu" aria-expanded={menu === 'products'} className="mk-navlink"
              style={{ fontSize: 14.5, fontWeight: productsActive ? 700 : 500, color: productsActive ? T.purple : '#334155', background: productsActive ? 'rgba(109,40,217,0.08)' : 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, fontFamily: 'inherit' }}>Products ▾</button>
            <AnimatePresence>
              {menu === 'products' && (
                <motion.div role="menu" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
                  style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, width: 380, background: '#fff', border: '1px solid rgba(15,16,32,0.10)', borderRadius: 16, boxShadow: '0 24px 50px -12px rgba(15,16,32,0.25)', padding: 8, zIndex: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 12px 4px' }}>Products</div>
                  {PRODUCTS.map((p) => (
                    <Link key={p.href} href={p.href} role="menuitem" className="mk-prodcard" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textDecoration: 'none', padding: '12px', borderRadius: 12 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>◆</span>
                      <span>
                        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: T.ink }}>{p.name}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: '#64748B', lineHeight: 1.5, marginTop: 2 }}>{p.desc}</span>
                      </span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Roadmap (Pricing hidden until finalised) */}
          {LINKS.filter(([, h]) => h !== '/').map(([l, h]) => {
            const active = isActive(pathname, h)
            return <Link key={h} href={h} onClick={samePage(h)} aria-current={active ? 'page' : undefined} className="mk-navlink" style={{ fontSize: 14.5, fontWeight: active ? 700 : 500, color: active ? T.purple : '#334155', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, background: active ? 'rgba(109,40,217,0.08)' : 'transparent' }}>{l}</Link>
          })}
        </nav>

        <div className="mk-desk" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === 'signin' ? null : 'signin')) }} aria-haspopup="menu" aria-expanded={menu === 'signin'} className="mk-navlink" style={{ fontSize: 14.5, fontWeight: 500, color: '#334155', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, fontFamily: 'inherit' }}>Sign in ▾</button>
            <AnimatePresence>
              {menu === 'signin' && (
                <motion.div role="menu" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, background: '#fff', border: '1px solid rgba(15,16,32,0.10)', borderRadius: 14, boxShadow: '0 16px 40px -12px rgba(15,16,32,0.22)', padding: 8, zIndex: 120 }}>
                  {SIGN_IN_OPTIONS.map((o) => (
                    <Link key={o.href} href={o.href} role="menuitem" className="mk-prodcard" style={{ display: 'block', textDecoration: 'none', padding: '11px 12px', borderRadius: 10 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{o.name} <span style={{ color: '#94A3B8', fontWeight: 500 }}>→</span></span>
                      <span style={{ display: 'block', fontSize: 12, color: '#64748B', lineHeight: 1.45, marginTop: 2 }}>{o.desc}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link href={onHire ? '/hire/signup' : '/contact'} style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: `linear-gradient(120deg, ${T.purple}, ${T.blue})`, padding: '9px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 8px 22px rgba(109,40,217,0.3)' }}>{onHire ? 'Start free' : 'Book a demo'}</Link>
        </div>
        <button className="mk-mob" onClick={() => setOpen(true)} aria-label="Menu" style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: T.ink }}>☰</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: T.ink, zIndex: 200, padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: 26, color: '#fff', cursor: 'pointer' }}>×</button>
            <motion.nav initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.05 } } }} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 20 }}>
              {([
                ['Platform', '/'],
                ['Hire', '/hire'],
                ['Screen', '/interviews'],
                ['Roadmap', '/roadmap'],
                ['Pricing', '/pricing'],
                ['Sign in · Levl1 Hire', '/hire/login'],
                ['Sign in · Levl1 Screen', '/interviews/login'],
                onHire ? ['Start free', '/hire/signup'] : ['Book a demo', '/contact'],
              ] as [string, string][]).map(([l, h]) => {
                const active = isActive(pathname, h)
                return (
                  <motion.div key={l} variants={{ h: { opacity: 0, x: -20 }, s: { opacity: 1, x: 0 } }}>
                    <Link href={h} onClick={(e) => { samePage(h)(e); setOpen(false) }} aria-current={active ? 'page' : undefined} style={{ fontSize: 24, fontWeight: 700, color: active ? '#A78BFA' : '#fff', textDecoration: 'none', padding: '9px 0', display: 'block' }}>{l}</Link>
                  </motion.div>
                )
              })}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.mk-prodcard{transition:background .12s ease}.mk-prodcard:hover{background:rgba(109,40,217,0.06)}`}</style>
    </header>
  )
}
