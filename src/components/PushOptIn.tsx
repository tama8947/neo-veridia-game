'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushOptIn() {
  const { state, subscribe, unsubscribe } = usePushNotifications()

  if (state === 'unsupported' || state === 'denied') return null

  if (state === 'subscribed') {
    return (
      <button
        onClick={unsubscribe}
        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        title="Desactivar notificaciones"
      >
        🔔
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      className="text-xs text-white/30 hover:text-white/60 transition-colors"
      title="Activar notificaciones de turno"
    >
      🔕
    </button>
  )
}
