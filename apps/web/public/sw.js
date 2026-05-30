/* ═══════════════════════════════════════════════════════════════
   Levl1 Service Worker
   - Precaches app shell on install
   - Network-first for API routes, cache-first for static assets
   - Push notification support
   - Background sync placeholder
═══════════════════════════════════════════════════════════════ */

const CACHE_NAME    = 'levl1-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

/* ── Install: cache app shell ──────────────────────────────── */
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      /* best-effort — don't fail install if a resource is unavailable */
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
      )
    })
  )
})

/* ── Activate: clean up old caches ────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

/* ── Fetch: routing strategy ───────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  /* Skip non-GET, cross-origin, and Next.js internals */
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  /* Network-first for navigation requests */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  /* Cache-first for static assets */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
        }
        return res
      })
    })
  )
})

/* ── Push notifications ────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = { title: 'Levl1', body: 'You have a new notification' }
  try {
    data = event.data?.json() ?? data
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     data.tag     ?? 'levl1-notification',
      data:    data.url     ? { url: data.url } : undefined,
      actions: data.actions ?? [],
      vibrate: [200, 100, 200],
    })
  )
})

/* ── Notification click: focus or open window ─────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin))
        if (existing) {
          existing.focus()
          existing.navigate(targetUrl)
        } else {
          self.clients.openWindow(targetUrl)
        }
      })
  )
})
