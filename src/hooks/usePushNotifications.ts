'use client'

import { useState } from 'react'

export type PushState = 'idle' | 'subscribed' | 'denied' | 'unsupported'

export function usePushNotifications() {
  const [state, setState] = useState<PushState>(() => {
    if (typeof window === 'undefined') return 'idle'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
    return 'idle'
  })

  async function subscribe() {
    if (!('serviceWorker' in navigator)) return

    const reg = await navigator.serviceWorker.register('/sw.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setState('denied'); return }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: vapidKey,
    })

    const json = sub.toJSON()
    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        endpoint: json.endpoint,
        p256dh:   json.keys?.p256dh,
        auth:     json.keys?.auth,
      }),
    })

    setState('subscribed')
  }

  async function unsubscribe() {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return

    await fetch('/api/push/subscribe', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
    setState('idle')
  }

  return { state, subscribe, unsubscribe }
}
