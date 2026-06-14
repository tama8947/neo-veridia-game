self.addEventListener('push', event => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Neo-Veridia', body: event.data.text() }
  }

  const { title = 'Neo-Veridia', body = '', icon = '/icons/icon-192.png', badge = '/icons/badge-72.png', url = '/' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    }),
  )
})
