import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import {
  calculateRent, checkCluster, upgradeCost, mortgageValue,
  applyMortgage, applyUpgrade,
} from '../economy'
import type { GameContext, Tile, TileId } from '../schemas'

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  return {
    tiles: buildBoard(),
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
        credits: 1500, energy: 10, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
      p2: {
        id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
        credits: 1500, energy: 10, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
    },
    turnOrder: ['p1', 'p2'],
    currentPlayerIndex: 0,
    currentTurn: 1,
    maxTurns: 40,
    phase: 'rolling',
    globalEffects: [],
    log: [],
    ...overrides,
  } as GameContext
}

// Helper: find the 3 tile IDs of a specific color in the board
function colorTileIds(board: Record<TileId, Tile>, color: string): TileId[] {
  return Object.keys(board).filter(id => board[id].color === color) as TileId[]
}

// Helper: set all tiles of a color to be owned by a player
function ownAllColor(ctx: GameContext, color: string, playerId: string): GameContext {
  const ids = colorTileIds(ctx.tiles, color)
  const tiles = { ...ctx.tiles }
  ids.forEach(id => { tiles[id] = { ...tiles[id], ownerId: playerId } })
  return { ...ctx, tiles }
}

describe('upgradeCost', () => {
  it('nivel 0→1 cuesta 3⚡', () => expect(upgradeCost(0)).toBe(3))
  it('nivel 1→2 cuesta 5⚡', () => expect(upgradeCost(1)).toBe(5))
  it('nivel 2→3 cuesta 8⚡', () => expect(upgradeCost(2)).toBe(8))
  it('nivel 3 no tiene costo (ya es máximo)', () => expect(upgradeCost(3)).toBe(0))
})

describe('mortgageValue', () => {
  it('retorna 50% del baseCost', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tile = ctx.tiles[cyanIds[0]]
    expect(mortgageValue(tile)).toBe(Math.floor(tile.baseCost * 0.5))
  })
})

describe('calculateRent', () => {
  it('retorna baseRent si tile sin mejoras y sin clúster', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p2' } }
    const rent = calculateRent({ ...ctx, tiles }, tileId)
    expect(rent).toBe(ctx.tiles[tileId].baseRent)
  })

  it('retorna 0 si tile está hipotecado', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p2', isMortgaged: true } }
    expect(calculateRent({ ...ctx, tiles }, tileId)).toBe(0)
  })

  it('retorna 0 si tile sin dueño', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    expect(calculateRent(ctx, cyanIds[0])).toBe(0)
  })

  it('aplica x1.5 por upgradeLevel 1', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const base = ctx.tiles[tileId].baseRent
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p2', upgradeLevel: 1 as const } }
    expect(calculateRent({ ...ctx, tiles }, tileId)).toBe(Math.floor(base * 1.5))
  })

  it('aplica x2.0 por upgradeLevel 2', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const base = ctx.tiles[tileId].baseRent
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p2', upgradeLevel: 2 as const } }
    expect(calculateRent({ ...ctx, tiles }, tileId)).toBe(Math.floor(base * 2.0))
  })

  it('aplica x3.0 por upgradeLevel 3', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const base = ctx.tiles[tileId].baseRent
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p2', upgradeLevel: 3 as const } }
    expect(calculateRent({ ...ctx, tiles }, tileId)).toBe(Math.floor(base * 3.0))
  })

  it('aplica clúster x2 sobre renta base cuando jugador posee los 3 tiles del color', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const ctxWithCluster = ownAllColor(ctx, 'cyan', 'p2')
    const baseRent = ctx.tiles[cyanIds[0]].baseRent
    const rent = calculateRent(ctxWithCluster, cyanIds[0])
    expect(rent).toBe(Math.floor(baseRent * 2.0))
  })

  it('aplica clúster x2 SOBRE la renta con mejoras (multiplicadores se apilan)', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    let ctxWithCluster = ownAllColor(ctx, 'cyan', 'p2')
    // Upgrade tile 0 to level 1
    ctxWithCluster = {
      ...ctxWithCluster,
      tiles: { ...ctxWithCluster.tiles, [cyanIds[0]]: { ...ctxWithCluster.tiles[cyanIds[0]], upgradeLevel: 1 as const } },
    }
    const baseRent = ctx.tiles[cyanIds[0]].baseRent
    const rent = calculateRent(ctxWithCluster, cyanIds[0])
    expect(rent).toBe(Math.floor(Math.floor(baseRent * 1.5) * 2.0))
  })

  it('no activa clúster si solo 2 de 3 tiles del color son del mismo dueño', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tiles = {
      ...ctx.tiles,
      [cyanIds[0]]: { ...ctx.tiles[cyanIds[0]], ownerId: 'p2' },
      [cyanIds[1]]: { ...ctx.tiles[cyanIds[1]], ownerId: 'p2' },
      // cyanIds[2] sin dueño
    }
    const baseRent = ctx.tiles[cyanIds[0]].baseRent
    const rent = calculateRent({ ...ctx, tiles }, cyanIds[0])
    expect(rent).toBe(baseRent)  // sin bonus
  })

  it('aplica RENT_INCREASE_25 de efecto global', () => {
    const ctx = makeCtx({
      globalEffects: [{ key: 'RENT_INCREASE_25' }],
    })
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p2' } }
    const baseRent = ctx.tiles[tileId].baseRent
    const rent = calculateRent({ ...ctx, tiles }, tileId)
    expect(rent).toBe(Math.floor(baseRent * 1.25))
  })
})

describe('checkCluster', () => {
  it('retorna true si jugador posee los 3 tiles del color y forman grupo conectado', () => {
    const ctx = makeCtx()
    const ctxWithCluster = ownAllColor(ctx, 'cyan', 'p1')
    expect(checkCluster(ctxWithCluster.tiles, 'p1', 'cyan')).toBe(true)
  })

  it('retorna false si jugador solo posee 2 de 3 tiles del color', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tiles = {
      ...ctx.tiles,
      [cyanIds[0]]: { ...ctx.tiles[cyanIds[0]], ownerId: 'p1' },
      [cyanIds[1]]: { ...ctx.tiles[cyanIds[1]], ownerId: 'p1' },
    }
    expect(checkCluster({ ...ctx, tiles }.tiles, 'p1', 'cyan')).toBe(false)
  })

  it('retorna false si uno de los tiles está hipotecado', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    let ctxWithCluster = ownAllColor(ctx, 'cyan', 'p1')
    ctxWithCluster = {
      ...ctxWithCluster,
      tiles: { ...ctxWithCluster.tiles, [cyanIds[0]]: { ...ctxWithCluster.tiles[cyanIds[0]], isMortgaged: true } },
    }
    expect(checkCluster(ctxWithCluster.tiles, 'p1', 'cyan')).toBe(false)
  })
})

describe('applyUpgrade', () => {
  it('incrementa upgradeLevel del tile', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    const result = applyUpgrade({ ...ctx, tiles }, 'p1', tileId)
    expect(result.tiles[tileId].upgradeLevel).toBe(1)
  })

  it('deduce el costo en energía del jugador', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    const result = applyUpgrade({ ...ctx, tiles }, 'p1', tileId)
    expect(result.players['p1'].energy).toBe(ctx.players['p1'].energy - upgradeCost(0))
  })

  it('no permite upgrade si tile no es del jugador', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    expect(() => applyUpgrade(ctx, 'p1', tileId)).toThrow()
  })

  it('no permite upgrade si tile en nivel máximo 3', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1', upgradeLevel: 3 as const } }
    expect(() => applyUpgrade({ ...ctx, tiles }, 'p1', tileId)).toThrow()
  })

  it('no permite upgrade si player.energy < costo', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], energy: 0 } }
    expect(() => applyUpgrade({ ...ctx, tiles, players }, 'p1', tileId)).toThrow()
  })

  it('no permite upgrade si tile está hipotecado', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1', isMortgaged: true } }
    expect(() => applyUpgrade({ ...ctx, tiles }, 'p1', tileId)).toThrow()
  })

  it('no permite upgrade si tile está bajo asedio', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1', isUnderSiege: true, siegeByPlayerId: 'p2' } }
    expect(() => applyUpgrade({ ...ctx, tiles }, 'p1', tileId)).toThrow()
  })
})

describe('applyMortgage', () => {
  it('marca tile como hipotecado', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    const result = applyMortgage({ ...ctx, tiles }, 'p1', tileId)
    expect(result.tiles[tileId].isMortgaged).toBe(true)
  })

  it('añade 50% del baseCost en créditos al jugador', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const base = ctx.tiles[tileId].baseCost
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    const result = applyMortgage({ ...ctx, tiles }, 'p1', tileId)
    expect(result.players['p1'].credits).toBe(ctx.players['p1'].credits + Math.floor(base * 0.5))
  })

  it('no permite hipotecar tile que no es del jugador', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    expect(() => applyMortgage(ctx, 'p1', cyanIds[0])).toThrow()
  })

  it('no permite hipotecar tile ya hipotecado', () => {
    const ctx = makeCtx()
    const cyanIds = colorTileIds(ctx.tiles, 'cyan')
    const tileId = cyanIds[0]
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1', isMortgaged: true } }
    expect(() => applyMortgage({ ...ctx, tiles }, 'p1', tileId)).toThrow()
  })
})
