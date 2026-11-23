'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// ── Screen app theme scope (dark mode) ─────────────────────────────────────
// Marks <html data-lv-app> on Screen recruiter routes only, so the --lv dark
// tokens (screen-tokens.css, prefers-color-scheme: dark) apply there and
// nowhere else — Hire, marketing, login and candidate-facing pages are never
// affected. On <html> (not a wrapper) so portalled modals/drawers inherit it.

/** Screen recruiter routes that are fully on --lv tokens. */
const SCREEN_APP_SOURCE = '^/(dashboard|positions|reports?|playback|settings|onboarding)(/|$)'

export function isScreenAppRoute(pathname: string): boolean {
  return new RegExp(SCREEN_APP_SOURCE).test(pathname)
}

/** Every Screen surface (recruiter app + candidate-facing + interview room +
 *  Solve + reports + auth) — gets the shared display typography via
 *  html[data-lv-type] (screen-ui.css). Never Hire, marketing or admin. */
const SCREEN_TYPE_SOURCE = '^/(dashboard|positions|reports?|playback|settings|onboarding|interview|interviews|candidate|schedule|solve|approve|signin|signup|accept-invite|forgot-password|reset-password)(/|$)'

export function isScreenSurface(pathname: string): boolean {
  return new RegExp(SCREEN_TYPE_SOURCE).test(pathname)
}

/** Pre-paint: set the attribute before first render so dark users never see a light flash. */
export const screenThemeScript =
  `(function(){try{var p=location.pathname,d=document.documentElement;if(new RegExp(${JSON.stringify(SCREEN_APP_SOURCE)}).test(p))d.setAttribute('data-lv-app','');if(new RegExp(${JSON.stringify(SCREEN_TYPE_SOURCE)}).test(p))d.setAttribute('data-lv-type','')}catch(e){}})()`

/** Keeps the attribute in sync across client-side navigations. */
export function ScreenThemeScope() {
  const pathname = usePathname() ?? ''
  useEffect(() => {
    const el = document.documentElement
    if (isScreenAppRoute(pathname)) el.setAttribute('data-lv-app', '')
    else el.removeAttribute('data-lv-app')
    if (isScreenSurface(pathname)) el.setAttribute('data-lv-type', '')
    else el.removeAttribute('data-lv-type')
  }, [pathname])
  return null
}
