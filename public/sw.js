/* eslint-env serviceworker */
/*
 * Apex Fitness service worker.
 *
 * Assumptions:
 * - The app is an authenticated SPA. Responses under /api/ are user-specific
 *   and must never be stored in a shared-origin cache.
 * - Next's hashed build output is unknowable at authoring time, so only a small
 *   explicit shell is precached; everything else is handled at runtime.
 */

const CACHE_VERSION = 'v1'
const SHELL_CACHE = `apex-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `apex-runtime-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE]

const OFFLINE_URL = '/offline.html'

// The manifest, the icons it references, and the offline fallback. Next's
// hashed JS/CSS chunks are deliberately absent: their filenames are only known
// after `next build`, so they are picked up by the runtime handlers instead.
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  OFFLINE_URL,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/')
}

function isImmutableAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

/** Network-first; on failure serve the offline shell page. */
async function handleNavigation(event) {
  try {
    const response = await fetch(event.request)
    const cache = await caches.open(RUNTIME_CACHE)
    cache.put(event.request, response.clone())
    return response
  } catch {
    const cached = await caches.match(event.request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline
    return new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

/** Cache-first: content-hashed URLs never change for a given path. */
async function handleImmutableAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

/** Stale-while-revalidate for public same-origin GETs (css, images, fonts). */
async function handleStaleWhileRevalidate(event) {
  const { request } = event
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)

  if (cached) {
    // Keep the worker alive until the background revalidation settles,
    // otherwise the browser may kill it before the cache is written.
    // Throws if the event is no longer active; the revalidation is best-effort
    // in that case, so swallowing the error is correct.
    try {
      event.waitUntil(networkPromise)
    } catch {
      /* best-effort background revalidation */
    }
    return cached
  }

  const response = await networkPromise
  if (response) return response
  return new Response('', { status: 504, statusText: 'Gateway Timeout' })
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // CRITICAL: authenticated API responses are never cached. The Cache Storage
  // is keyed by origin, not by session, so a cached /api/ response would be
  // served to the next user who opens the app on this device.
  if (isApiRequest(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
    return
  }

  if (isImmutableAsset(url)) {
    event.respondWith(handleImmutableAsset(request))
    return
  }

  event.respondWith(handleStaleWhileRevalidate(event))
})
