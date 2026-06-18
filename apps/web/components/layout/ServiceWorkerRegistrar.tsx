'use client'

import { useEffect } from 'react'

// The service worker is being retired — it pinned users to stale cached code and
// silently broke deploys. Instead of registering one, we actively unregister any
// worker still installed from a previous version and clear its caches. (The
// /sw.js kill-switch handles tabs whose old bundle still calls register(); this
// covers fresh loads so nothing re-installs a worker.)
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((reg) => { reg.unregister().catch(() => {}) }))
      .catch(() => {})
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => { caches.delete(k).catch(() => {}) })).catch(() => {})
    }
  }, [])

  return null
}
