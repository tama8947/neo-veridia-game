import webpush from 'web-push'

// Called once at server start — idempotent
export function initWebPush() {
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:admin@neo-veridia.app'

  if (!publicKey || !privateKey) return

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export interface PushSubscription {
  endpoint: string
  p256dh:   string
  auth:     string
}

export function buildNotificationPayload(
  title: string,
  body:  string,
  url?:  string,
): string {
  return JSON.stringify({
    title,
    body,
    icon:  '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url:   url ?? '/',
  })
}

export async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body:  string,
  url?:  string,
): Promise<{ ok: boolean; error?: string }> {
  initWebPush()
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      buildNotificationPayload(title, body, url),
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
