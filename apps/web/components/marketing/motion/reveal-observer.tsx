'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// One IntersectionObserver for every [data-reveal] element on the page.
// Re-scans on client-side navigation. Elements reveal once and stay revealed.
export function RevealObserver() {
  const pathname = usePathname()
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'))
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pathname])
  return null
}

// Inline, pre-paint: flag that JS is running so reveal styles may hide content.
export const REVEAL_BOOTSTRAP = "document.documentElement.classList.add('mk-js')"
