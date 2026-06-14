import { describe, it, expect } from 'vitest'
import { IntentSchema } from '../../schemas'
import { createInitialContext } from '../../game-machine'

// Tests for the logic that the PartyKit room depends on
// (room.ts itself requires Cloudflare Workers runtime — tested via integration)

describe('IntentSchema — validación de mensajes entrantes', () => {
  it('acepta ROLL_DICE válido', () => {
    const result = IntentSchema.safeParse({ type: 'ROLL_DICE' })
    expect(result.success).toBe(true)
  })

  it('acepta CHOOSE_PATH con path válido', () => {
    const result = IntentSchema.safeParse({
      type: 'CHOOSE_PATH',
      path: ['0,0,0', '1,0,-1'],
    })
    expect(result.success).toBe(true)
  })

  it('rechaza CHOOSE_PATH con path vacío', () => {
    const result = IntentSchema.safeParse({ type: 'CHOOSE_PATH', path: [] })
    expect(result.success).toBe(false)
  })

  it('rechaza tipo de evento desconocido', () => {
    const result = IntentSchema.safeParse({ type: 'HACK_SERVER' })
    expect(result.success).toBe(false)
  })

  it('acepta BUY_PROPERTY con tileId válido', () => {
    const result = IntentSchema.safeParse({ type: 'BUY_PROPERTY', tileId: '1,-1,0' })
    expect(result.success).toBe(true)
  })

  it('rechaza BUY_PROPERTY sin tileId', () => {
    const result = IntentSchema.safeParse({ type: 'BUY_PROPERTY' })
    expect(result.success).toBe(false)
  })

  it('acepta PAY_STASIS con method credits', () => {
    const result = IntentSchema.safeParse({ type: 'PAY_STASIS', method: 'credits' })
    expect(result.success).toBe(true)
  })

  it('rechaza PAY_STASIS con method inválido', () => {
    const result = IntentSchema.safeParse({ type: 'PAY_STASIS', method: 'bitcoin' })
    expect(result.success).toBe(false)
  })
})

describe('createInitialContext — validación para 2 y 3 jugadores', () => {
  it('crea contexto válido para 2 jugadores con turnOrder correcto', () => {
    const ctx = createInitialContext([
      { id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto' },
      { id: 'p2', userId: 'u2', characterSlug: 'la-mercader' },
    ])
    expect(ctx.turnOrder).toHaveLength(2)
    expect(ctx.phase).toBe('rolling')
    expect(ctx.currentTurn).toBe(1)
    expect(ctx.players['p1'].credits).toBe(1500)
    expect(ctx.players['p2'].energy).toBe(10)
  })

  it('crea contexto válido para 3 jugadores', () => {
    const ctx = createInitialContext([
      { id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto' },
      { id: 'p2', userId: 'u2', characterSlug: 'la-mercader' },
      { id: 'p3', userId: 'u3', characterSlug: 'el-energista' },
    ])
    expect(ctx.turnOrder).toHaveLength(3)
    expect(Object.keys(ctx.players)).toHaveLength(3)
  })

  it('todos los jugadores comienzan en el núcleo 0,0,0', () => {
    const ctx = createInitialContext([
      { id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto' },
      { id: 'p2', userId: 'u2', characterSlug: 'la-mercader' },
    ])
    expect(ctx.players['p1'].currentTileId).toBe('0,0,0')
    expect(ctx.players['p2'].currentTileId).toBe('0,0,0')
  })
})
