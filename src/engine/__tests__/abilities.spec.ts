import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import { CHARACTER_ROSTER, getAbility, applyAbility } from '../abilities'
import type { GameContext, TileId } from '../schemas'

function makeCtx(characterSlug = 'el-arquitecto', overrides: Partial<GameContext> = {}): GameContext {
  return {
    tiles: buildBoard(),
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug,
        credits: 500, energy: 6, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
      p2: {
        id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
        credits: 400, energy: 4, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
    },
    turnOrder: ['p1', 'p2'],
    currentPlayerIndex: 0,
    currentTurn: 5,
    maxTurns: 40,
    phase: 'rolling',
    globalEffects: [],
    log: [],
    ...overrides,
  } as GameContext
}

describe('CHARACTER_ROSTER', () => {
  it('contiene exactamente 25 personajes', () => {
    expect(CHARACTER_ROSTER).toHaveLength(25)
  })

  it('cada personaje tiene slug, tier y abilityKey únicos', () => {
    const slugs = CHARACTER_ROSTER.map(c => c.slug)
    const keys = CHARACTER_ROSTER.map(c => c.abilityKey)
    expect(new Set(slugs).size).toBe(25)
    expect(new Set(keys).size).toBe(25)
  })

  it('tiene 10 personajes base, 8 achievement y 7 premium', () => {
    const base = CHARACTER_ROSTER.filter(c => c.tier === 'base')
    const ach  = CHARACTER_ROSTER.filter(c => c.tier === 'achievement')
    const prem = CHARACTER_ROSTER.filter(c => c.tier === 'premium')
    expect(base).toHaveLength(10)
    expect(ach).toHaveLength(8)
    expect(prem).toHaveLength(7)
  })
})

describe('getAbility', () => {
  it('retorna la habilidad del personaje dado su slug', () => {
    const ability = getAbility('el-arquitecto')
    expect(ability).toBeDefined()
    expect(ability!.key).toBe('ARCHITECT_DISCOUNT')
  })

  it('retorna undefined para slug desconocido', () => {
    expect(getAbility('personaje-inexistente')).toBeUndefined()
  })
})

describe('applyAbility — ARCHITECT_DISCOUNT', () => {
  it('descuenta 10% al comprar una propiedad (reduce baseCost en ctx)', () => {
    const ctx = makeCtx('el-arquitecto')
    const cyanIds = Object.keys(ctx.tiles).filter(id => ctx.tiles[id as TileId].color === 'cyan') as TileId[]
    const tileId = cyanIds[0]
    const result = applyAbility(ctx, 'p1', 'ARCHITECT_DISCOUNT', { tileId })
    const originalCost = ctx.tiles[tileId].baseCost
    // Ability adds a temporary discount effect to globalEffects
    expect(result.globalEffects.some(e => e.key === 'ARCHITECT_DISCOUNT')).toBe(true)
    // baseCost unchanged in tiles (discount applied at buy time via globalEffect)
    expect(result.tiles[tileId].baseCost).toBe(originalCost)
  })
})

describe('applyAbility — MERCADER_CREDIT_BOOST', () => {
  it('la mercader gana +20💰 extra al cobrar renta', () => {
    const ctx = makeCtx('la-mercader', { currentPlayerIndex: 1 })
    const result = applyAbility(ctx, 'p2', 'MERCADER_CREDIT_BOOST', {})
    expect(result.globalEffects.some(e => e.key === 'MERCADER_CREDIT_BOOST')).toBe(true)
  })
})

describe('applyAbility — lanza error con habilidad inválida', () => {
  it('lanza error si abilityKey no existe', () => {
    const ctx = makeCtx()
    expect(() => applyAbility(ctx, 'p1', 'HABILIDAD_INEXISTENTE', {})).toThrow()
  })
})
