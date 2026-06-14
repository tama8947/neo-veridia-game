import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import { startAuction, placeBid, resolveAuction } from '../auction'
import type { GameContext, TileId } from '../schemas'

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  const tiles = buildBoard()
  const cyanId = Object.keys(tiles).find(id => tiles[id as TileId].color === 'cyan') as TileId
  return {
    tiles,
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
        credits: 500, energy: 5, currentTileId: '0,0,0' as TileId,
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
    currentTurn: 38,
    maxTurns: 40,
    phase: 'auction',
    globalEffects: [],
    log: [],
    ...overrides,
    _cyanId: cyanId,
  } as unknown as GameContext
}

function getCyanId(ctx: GameContext): TileId {
  return Object.keys(ctx.tiles).find(id => ctx.tiles[id as TileId].color === 'cyan') as TileId
}

describe('startAuction', () => {
  it('crea subasta activa para el tile dado', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    const result = startAuction(ctx, tileId)
    expect(result.auction).toBeDefined()
    expect(result.auction!.tileId).toBe(tileId)
    expect(result.auction!.active).toBe(true)
    expect(result.auction!.timerMs).toBe(15_000)
    expect(result.auction!.bids).toEqual({})
  })

  it('lanza error si el tile ya tiene dueño', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    const tiles = { ...ctx.tiles, [tileId]: { ...ctx.tiles[tileId], ownerId: 'p1' } }
    expect(() => startAuction({ ...ctx, tiles }, tileId)).toThrow()
  })

  it('lanza error si ya hay una subasta activa', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    const withAuction = startAuction(ctx, tileId)
    expect(() => startAuction(withAuction, tileId)).toThrow()
  })
})

describe('placeBid', () => {
  it('registra la puja del jugador', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    const withAuction = startAuction(ctx, tileId)
    const result = placeBid(withAuction, 'p1', tileId, 150)
    expect(result.auction!.bids['p1']).toBe(150)
  })

  it('permite sobrepujar (reemplaza la puja anterior)', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    let result = startAuction(ctx, tileId)
    result = placeBid(result, 'p1', tileId, 100)
    result = placeBid(result, 'p1', tileId, 200)
    expect(result.auction!.bids['p1']).toBe(200)
  })

  it('lanza error si no hay subasta activa', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    expect(() => placeBid(ctx, 'p1', tileId, 100)).toThrow()
  })

  it('lanza error si la puja es mayor que los créditos del jugador', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    const withAuction = startAuction(ctx, tileId)
    expect(() => placeBid(withAuction, 'p1', tileId, 9999)).toThrow()
  })

  it('lanza error si la nueva puja es menor o igual a la anterior', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    let result = startAuction(ctx, tileId)
    result = placeBid(result, 'p1', tileId, 200)
    expect(() => placeBid(result, 'p1', tileId, 100)).toThrow()
  })
})

describe('resolveAuction', () => {
  it('asigna el tile al mayor postor y le cobra los créditos', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    let result = startAuction(ctx, tileId)
    result = placeBid(result, 'p1', tileId, 150)
    result = placeBid(result, 'p2', tileId, 200)
    result = resolveAuction(result)
    expect(result.tiles[tileId].ownerId).toBe('p2')
    expect(result.players['p2'].credits).toBe(200) // 400 - 200
    expect(result.auction).toBeUndefined()
  })

  it('no asigna si no hay pujas y cierra la subasta', () => {
    const ctx = makeCtx()
    const tileId = getCyanId(ctx)
    let result = startAuction(ctx, tileId)
    result = resolveAuction(result)
    expect(result.tiles[tileId].ownerId).toBeUndefined()
    expect(result.auction).toBeUndefined()
  })

  it('lanza error si no hay subasta activa', () => {
    const ctx = makeCtx()
    expect(() => resolveAuction(ctx)).toThrow()
  })
})
