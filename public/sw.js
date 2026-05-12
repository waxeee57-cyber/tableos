self.addEventListener('install', (e) => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/admin/orders')
    })
  )
})
