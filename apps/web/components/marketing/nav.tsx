'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import { NAV, ROUTES, SIGN_IN, type NavGroup, type NavLink } from '@/config/site'
import { Icon } from './icon'
import { Logo } from './logo'

const PRIMARY = { label: 'Book a demo', href: ROUTES.demo }
const DEMO = { label: 'Try a demo interview', href: ROUTES.screenDemo }

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}
function groupActive(pathname: string, g: NavGroup) {
  return g.columns.some((c) => c.links.some((l) => isActive(pathname, l.href)))
}

export function MarketingNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>()
  const focusFirst = useRef(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menus on navigation.
  useEffect(() => { setOpen(null); setDrawer(false) }, [pathname])

  // Click outside / Escape closes the open desktop menu and returns focus.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!navRef.current?.contains(e.target as Node)) setOpen(null) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const trigger = document.getElementById(`mk-trigger-${open}`)
      setOpen(null); trigger?.focus()
    }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const hoverOpen = useCallback((key: string | null) => {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setOpen(key), key ? 60 : 160)
  }, [])

  const solid = scrolled || open !== null
  return (
    <header className={`fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color,box-shadow] duration-300 ${solid ? 'mk-glass border-b border-black/[0.06] shadow-[0_8px_30px_-20px_rgba(15,16,32,0.25)]' : 'border-b border-transparent'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg">Skip to content</a>
      <nav ref={navRef} aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-5 sm:px-8">
        <Link href="/" aria-label="Levl1 home" className="mr-4 flex items-center rounded-md py-1"><Logo variant="black" height={24} priority /></Link>

        <ul className="hidden items-center gap-0.5 lg:flex" onMouseLeave={() => hoverOpen(null)}>
          {NAV.map((g) => (
            <li key={g.label} className="relative" onMouseEnter={() => hoverOpen(g.label)}>
              <DesktopTrigger group={g} expanded={open === g.label} active={groupActive(pathname, g)}
                onToggle={() => setOpen((o) => (o === g.label ? null : g.label))} onOpenAndFocus={() => { focusFirst.current = true; setOpen(g.label) }} />
              {open === g.label && <MegaPanel group={g} pathname={pathname} focusFirst={focusFirst} />}
            </li>
          ))}
          <li onMouseEnter={() => hoverOpen(null)}>
            <Link href={ROUTES.pricing} aria-current={isActive(pathname, ROUTES.pricing) ? 'page' : undefined}
              className={`rounded-full px-3.5 py-2 text-[0.92rem] font-medium transition-colors hover:bg-black/[0.04] hover:text-mk-ink ${isActive(pathname, ROUTES.pricing) ? 'text-mk-purple' : 'text-slate-700'}`}>Pricing</Link>
          </li>
        </ul>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <div className="relative" onMouseEnter={() => hoverOpen('signin')} onMouseLeave={() => hoverOpen(null)}>
            <button id="mk-trigger-signin" type="button" aria-expanded={open === 'signin'} aria-controls="mk-panel-signin"
              onClick={() => setOpen((o) => (o === 'signin' ? null : 'signin'))}
              className="mk-nav-trigger flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.92rem] font-medium text-slate-700 transition-colors hover:bg-black/[0.04] hover:text-mk-ink">
              Sign in <ChevronDown aria-hidden className="mk-chev h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            {open === 'signin' && (
              <div id="mk-panel-signin" className="mk-menu-enter absolute right-0 top-[calc(100%+10px)] w-72 rounded-2xl border border-black/[0.07] bg-white p-2 shadow-[0_30px_60px_-20px_rgba(15,16,32,0.3)]">
                {SIGN_IN.map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-xl px-3.5 py-3 transition-colors hover:bg-violet-50/70 focus-visible:bg-violet-50/70">
                    <span className="block text-[0.92rem] font-semibold text-mk-ink">{l.label}</span>
                    <span className="mt-0.5 block text-[0.8rem] text-mk-muted">{l.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href={DEMO.href} className="mk-btn mk-btn-secondary hidden !px-4 !py-2.5 !text-[0.86rem] xl:inline-flex">{DEMO.label}</Link>
          <Link href={PRIMARY.href} className="mk-btn mk-btn-primary !px-4 !py-2.5 !text-[0.86rem]">{PRIMARY.label}</Link>
        </div>

        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="mk-drawer"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-mk-ink transition-colors hover:bg-black/[0.05] lg:hidden">
          <Menu aria-hidden className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </nav>
      {drawer && <MobileDrawer pathname={pathname} onClose={() => setDrawer(false)} />}
    </header>
  )
}

function DesktopTrigger({ group, expanded, active, onToggle, onOpenAndFocus }: {
  group: NavGroup; expanded: boolean; active: boolean; onToggle: () => void; onOpenAndFocus: () => void
}) {
  return (
    <button id={`mk-trigger-${group.label}`} type="button" aria-expanded={expanded} aria-controls={`mk-panel-${group.label}`} onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown') return
        e.preventDefault()
        if (expanded) document.querySelector<HTMLAnchorElement>(`#mk-panel-${group.label} a`)?.focus()
        else onOpenAndFocus()
      }}
      className={`mk-nav-trigger flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.92rem] font-medium transition-colors hover:bg-black/[0.04] hover:text-mk-ink ${active || expanded ? 'text-mk-purple' : 'text-slate-700'}`}>
      {group.label}<ChevronDown aria-hidden className="mk-chev h-3.5 w-3.5" strokeWidth={2.4} />
    </button>
  )
}

function MegaPanel({ group, pathname, focusFirst }: { group: NavGroup; pathname: string; focusFirst: React.MutableRefObject<boolean> }) {
  const wide = group.columns.length > 1
  const ref = useRef<HTMLDivElement>(null)
  // Opened from the keyboard (ArrowDown on the trigger) → focus the first item.
  useEffect(() => {
    if (!focusFirst.current) return
    focusFirst.current = false
    ref.current?.querySelector<HTMLAnchorElement>('a')?.focus()
  }, [focusFirst])
  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>('a'))
    const i = links.indexOf(document.activeElement as HTMLAnchorElement)
    e.preventDefault()
    links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus()
  }
  return (
    <div id={`mk-panel-${group.label}`} ref={ref} onKeyDown={onKey}
      className={`mk-menu-enter absolute left-0 top-[calc(100%+10px)] rounded-3xl border border-black/[0.07] bg-white p-3 shadow-[0_40px_80px_-24px_rgba(15,16,32,0.35)] ${wide ? 'w-[640px]' : 'w-[380px]'}`}>
      <div className={wide ? 'grid grid-cols-2 gap-2' : ''}>
        {group.columns.map((col, ci) => (
          <div key={ci} className={wide && ci === 1 ? 'rounded-2xl bg-mk-mist/80 p-1' : 'p-1'}>
            {col.title && <p className="px-3 pb-1.5 pt-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500">{col.title}</p>}
            {col.links.map((l) => <MenuItem key={l.href} link={l} active={isActive(pathname, l.href)} />)}
          </div>
        ))}
      </div>
      {group.label === 'Products' && (
        <Link href={DEMO.href} className="mk-link mt-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 px-4 py-3 text-[0.88rem] font-semibold text-mk-purple">
          {DEMO.label} — no sign-up <ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2.2} />
        </Link>
      )}
    </div>
  )
}

function MenuItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link href={link.href} aria-current={active ? 'page' : undefined}
      className="group flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white hover:shadow-[0_6px_20px_-12px_rgba(49,46,129,0.35)] focus-visible:bg-white">
      {link.icon && <span className="mk-icon-tile !h-9 !w-9 flex-none !rounded-xl transition-transform duration-300 group-hover:scale-105"><Icon name={link.icon} className="h-[18px] w-[18px]" /></span>}
      <span>
        <span className={`block text-[0.92rem] font-semibold ${active ? 'text-mk-purple' : 'text-mk-ink'}`}>{link.label}</span>
        {link.desc && <span className="mt-0.5 block text-[0.8rem] leading-snug text-mk-muted">{link.desc}</span>}
      </span>
    </Link>
  )
}

function MobileDrawer({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [section, setSection] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('a, button')).filter((el) => el.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); opener?.focus() }
  }, [onClose])

  return (
    <div id="mk-drawer" ref={ref} role="dialog" aria-modal="true" aria-label="Menu" className="mk-drawer-enter fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-white">
      <div className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Levl1 home" onClick={onClose}><Logo variant="black" height={24} /></Link>
        <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[0.05]">
          <X aria-hidden className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>
      <div className="flex-1 px-5 pb-8 sm:px-8">
        <ul className="divide-y divide-mk-line border-b border-mk-line">
          {NAV.map((g) => {
            const expanded = section === g.label
            return (
              <li key={g.label}>
                <button type="button" aria-expanded={expanded} aria-controls={`mk-m-${g.label}`} onClick={() => setSection(expanded ? null : g.label)}
                  className="mk-nav-trigger flex w-full items-center justify-between py-4 text-left text-lg font-semibold text-mk-ink">
                  {g.label}<ChevronDown aria-hidden className="mk-chev h-5 w-5 text-slate-400" />
                </button>
                <div id={`mk-m-${g.label}`} hidden={!expanded} className="pb-3">
                  {g.columns.map((c, ci) => (
                    <div key={ci} className="mb-1">
                      {c.title && <p className="px-1 pb-1 pt-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500">{c.title}</p>}
                      {c.links.map((l) => <MenuItem key={l.href} link={l} active={isActive(pathname, l.href)} />)}
                    </div>
                  ))}
                </div>
              </li>
            )
          })}
          <li><Link href={ROUTES.pricing} className="block py-4 text-lg font-semibold text-mk-ink">Pricing</Link></li>
        </ul>
        <div className="mt-6">
          <p className="pb-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500">Sign in</p>
          <div className="grid grid-cols-2 gap-2">
            {SIGN_IN.map((l) => <Link key={l.href} href={l.href} className="rounded-2xl border border-mk-line px-4 py-3 text-[0.95rem] font-semibold text-mk-ink">{l.label}</Link>)}
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Link href={PRIMARY.href} className="mk-btn mk-btn-primary w-full">{PRIMARY.label}</Link>
          <Link href={DEMO.href} className="mk-btn mk-btn-secondary w-full">{DEMO.label}</Link>
        </div>
      </div>
    </div>
  )
}
