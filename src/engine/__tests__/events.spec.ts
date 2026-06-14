import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import { GUILD_EVENT_DECK, drawGuildEvent, applyGuildEvent } from '../events'
import type { GameContext, TileId } from '../schemas'

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  return {
    tiles: buildBoard(),
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
        credits: 500, energy: 5, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
      p2: {
        id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
        credits: 300, energy: 3, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
    },
    turnOrder: ['p1', 'p2'],
    currentPlayerIndex: 0,
    currentTurn: 1,
    maxTurns: 40,
    phase: 'guild_event',
    globalEffects: [],
    log: [],
    ...overrides,
  } as GameContext
}

describe('GUILD_EVENT_DECK', () => {
  it('contiene exactamente 13 cartas', () => {
    expect(GUILD_EVENT_DECK).toHaveLength(13)
  })

  it('las probabilidades suman 1.0 (±0.001)', () => {
    const sum = GUILD_EVENT_DECK.reduce((acc, c) => acc + c.probability, 0)
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001)
  })

  it('cada carta tiene id, name, effectKey y probability válidos', () => {
    for (const card of GUILD_EVENT_DECK) {
      expect(typeof card.id).toBe('string')
      expect(card.id.length).toBeGreaterThan(0)
      expect(typeof card.name).toBe('string')
      expect(typeof card.effectKey).toBe('string')
      expect(card.probability).toBeGreaterThan(0)
      expect(card.probability).toBeLessThanOrEqual(1)
    }
  })

  it('los IDs son únicos', () => {
    const ids = GUILD_EVENT_DECK.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('drawGuildEvent', () => {
  it('retorna una carta del deck', () => {
    const card = drawGuildEvent(GUILD_EVENT_DECK)
    expect(GUILD_EVENT_DECK.some(c => c.id === card.id)).toBe(true)
  })
})

describe('applyGuildEvent — BONUS_CREDITS', () => {
  it('suma 100💰 al jugador actual', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'BONUS_CREDITS')!
    const result = applyGuildEvent(ctx, card)
    expect(result.players['p1'].credits).toBe(600)
  })
})

describe('applyGuildEvent — ENERGY_BURST', () => {
  it('suma 5⚡ al jugador actual', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'ENERGY_BURST')!
    const result = applyGuildEvent(ctx, card)
    expect(result.players['p1'].energy).toBe(10)
  })
})

describe('applyGuildEvent — CREDITS_TAX', () => {
  it('cobra 10% de créditos a todos y los entrega al jugador actual', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'CREDITS_TAX')!
    const result = applyGuildEvent(ctx, card)
    // p1: 500 - 50(tax) + 50(self) + 30(from p2) = 530
    // p2: 300 - 30(tax) = 270
    expect(result.players['p1'].credits).toBe(530)
    expect(result.players['p2'].credits).toBe(270)
  })
})

describe('applyGuildEvent — STEAL_ENERGY', () => {
  it('roba 1⚡ de cada oponente y lo suma al jugador actual', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'STEAL_ENERGY')!
    const result = applyGuildEvent(ctx, card)
    expect(result.players['p1'].energy).toBe(6) // 5 + 1 from p2
    expect(result.players['p2'].energy).toBe(2) // 3 - 1
  })
})

describe('applyGuildEvent — GUILD_PROTECTION', () => {
  it('agrega efecto global GUILD_PROTECTION', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'GUILD_PROTECTION')!
    const result = applyGuildEvent(ctx, card)
    expect(result.globalEffects.some(e => e.key === 'GUILD_PROTECTION')).toBe(true)
  })
})

describe('applyGuildEvent — XP_BONUS', () => {
  it('otorga 50 XP al jugador actual', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'XP_BONUS')!
    const result = applyGuildEvent(ctx, card)
    expect(result.players['p1'].xpEarned).toBe(50)
  })
})

describe('applyGuildEvent — UPGRADE_FREE', () => {
  it('sube a nivel 1 el primer tile propio sin mejoras', () => {
    const ctx = makeCtx()
    const cyanIds = Object.keys(ctx.tiles).filter(id => ctx.tiles[id as TileId].color === 'cyan') as TileId[]
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'UPGRADE_FREE')!
    const result = applyGuildEvent({ ...ctx, tiles }, card)
    expect(result.tiles[tileId].upgradeLevel).toBe(1)
  })

  it('no hace nada si el jugador no tiene propiedades', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'UPGRADE_FREE')!
    const result = applyGuildEvent(ctx, card)
    expect(result).toEqual(ctx)
  })
})

describe('applyGuildEvent — CREDITS_TRANSFER', () => {
  it('transfiere 50💰 del jugador más rico al actual (si no es el mismo)', () => {
    const ctx = makeCtx({ players: {
      p1: { ...(makeCtx().players['p1']), credits: 200 },
      p2: { ...(makeCtx().players['p2']), credits: 800 },
    }})
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'CREDITS_TRANSFER')!
    const result = applyGuildEvent(ctx, card)
    expect(result.players['p1'].credits).toBe(250)
    expect(result.players['p2'].credits).toBe(750)
  })

  it('no hace nada si el jugador actual ya es el más rico', () => {
    const ctx = makeCtx()
    const card = GUILD_EVENT_DECK.find(c => c.effectKey === 'CREDITS_TRANSFER')!
    const result = applyGuildEvent(ctx, card)
    // p1 (500) es el más rico → sin transferencia
    expect(result.players['p1'].credits).toBe(500)
    expect(result.players['p2'].credits).toBe(300)
  })
})
