/* ═══════════════════════════════════════════════════════════════
   Levl1 Service Worker — SELF-UNREGISTERING KILL-SWITCH
   ---------------------------------------------------------------
   The previous SW cached the app shell and pinned users to a stale
   interview bundle across every deploy (the 'page-…' hash never
   changed), masking critical interview fixes and the Deepgram token.
   This version removes the SW entirely: it clears all caches,
   unregisters itself, and reloads any controlled tabs onto fresh,
   un-intercepted network responses. It never intercepts a fetch, so
   it can never serve stale code again.

   Re-introduce a properly-versioned SW later if PWA install / push is
   needed — but only with cache-busting that doesn't trap live routes.
═══════════════════════════════════════════════════════════════ */

self.addEventListener('install', () => {
  // Take over immediately, don't wait for old tabs to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Nuke every cache this origin ever created.
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {}
    // 2. Remove the service worker registration entirely.
    try { await self.registration.unregister() } catch {}
    // 3. Reload open tabs so they fetch fresh HTML/JS directly from the network.
    try {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) { try { client.navigate(client.url) } catch {} }
    } catch {}
  })())
})

/* No 'fetch' handler on purpose — every request goes straight to the network. */
