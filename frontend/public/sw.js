const CACHE_NAME = 'jsl-fastline-v1'
const OFFLINE_URL = '/offline.html'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/assets/index-*.css',
  '/assets/index-*.js'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event with offline-first strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Chrome extensions
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request))
    return
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        // Return cached version if available
        if (cached) {
          return cached
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache the response for future use
            if (response.ok && event.request.url.startsWith('http')) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache)
                })
            }
            return response
          })
          .catch(() => {
            // If both cache and network fail, show offline page
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL)
            }
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            })
          })
      })
  )
})

// Handle API requests with network-first, cache-fallback
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Both network and cache failed
    return new Response(JSON.stringify({
      error: 'You are offline',
      offline: true
    }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts())
  } else if (event.tag === 'sync-groups') {
    event.waitUntil(syncGroups())
  }
})

// Sync posts in background
async function syncPosts() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const requests = await cache.keys()
    const postRequests = requests.filter(req => 
      req.url.includes('/api/posts') && req.method === 'POST'
    )

    for (const request of postRequests) {
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.delete(request)
        }
      } catch (error) {
        console.error('Failed to sync post:', error)
      }
    }
  } catch (error) {
    console.error('Background sync error:', error)
  }
}

// Sync groups in background
async function syncGroups() {
  // Similar implementation to syncPosts
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New update from JSL FastLine',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('JSL FastLine', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})
