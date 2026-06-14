import { describe, it, expect } from 'vitest'
import { PushSubscribeBodySchema } from '../schemas'
import { buildNotificationPayload } from '../../lib/push'

describe('PushSubscribeBodySchema', () => {
  it('acepta suscripción válida', () => {
    const result = PushSubscribeBodySchema.safeParse({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtZ',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza si falta endpoint', () => {
    const result = PushSubscribeBodySchema.safeParse({ p256dh: 'abc', auth: 'xyz' })
    expect(result.success).toBe(false)
  })
})

describe('buildNotificationPayload', () => {
  it('construye payload con title y body', () => {
    const payload = buildNotificationPayload('¡Tu turno!', 'Es tu turno en Neo-Veridia')
    const parsed = JSON.parse(payload)
    expect(parsed.title).toBe('¡Tu turno!')
    expect(parsed.body).toBe('Es tu turno en Neo-Veridia')
  })

  it('incluye url si se proporciona', () => {
    const payload = buildNotificationPayload('Test', 'Body', '/room/abc123')
    const parsed = JSON.parse(payload)
    expect(parsed.url).toBe('/room/abc123')
  })

  it('incluye icon de Neo-Veridia por defecto', () => {
    const payload = buildNotificationPayload('Test', 'Body')
    const parsed = JSON.parse(payload)
    expect(parsed.icon).toBeDefined()
  })
})
