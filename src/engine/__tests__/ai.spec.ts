import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import { scoreGameState } from '../ai/heuristics'
import { chooseIntent } from '../ai/ai-player'
import type { GameContext, TileId } from '../schemas'

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  return {
    tiles: buildBoard(),
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
        credits: 800, energy: 8, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
      p2: {
        id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
        credits: 500, energy: 5, currentTileId: '0,0,0' as TileId,
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

function cyanIds(ctx: GameContext): TileId[] {
  return Object.keys(ctx.tiles).filter(id => ctx.tiles[id as TileId].color === 'cyan') as TileId[]
}

// ── heuristics ────────────────────────────────────────────────────────────────

describe('scoreGameState', () => {
  it('retorna valor más alto para jugador con más créditos', () => {
    const ctx = makeCtx()
    // p1 tiene 800💰, p2 tiene 500💰
    expect(scoreGameState(ctx, 'p1')).toBeGreaterThan(scoreGameState(ctx, 'p2'))
  })

  it('retorna valor más alto para jugador con más propiedades', () => {
    const ctx = makeCtx()
    const ids = cyanIds(ctx)
    const tiles = {
      ...ctx.tiles,
      [ids[0]]: { ...ctx.tiles[ids[0]], ownerId: 'p1' },
      [ids[1]]: { ...ctx.tiles[ids[1]], ownerId: 'p1' },
    }
    const ctxWithProps = { ...ctx, tiles, players: { ...ctx.players, p1: { ...ctx.players['p1'], credits: 500 } } }
    const scoreWithProps = scoreGameState(ctxWithProps, 'p1')
    const scoreWithout = scoreGameState({ ...ctxWithProps, tiles: ctx.tiles }, 'p1')
    expect(scoreWithProps).toBeGreaterThan(scoreWithout)
  })

  it('retorna valor más alto si el jugador tiene clúster completo', () => {
    const ctx = makeCtx()
    const ids = cyanIds(ctx)
    const tilesNoCluster = {
      ...ctx.tiles,
      [ids[0]]: { ...ctx.tiles[ids[0]], ownerId: 'p1' },
      [ids[1]]: { ...ctx.tiles[ids[1]], ownerId: 'p1' },
    }
    const tilesCluster = {
      ...tilesNoCluster,
      [ids[2]]: { ...ctx.tiles[ids[2]], ownerId: 'p1' },
    }
    expect(scoreGameState({ ...ctx, tiles: tilesCluster }, 'p1'))
      .toBeGreaterThan(scoreGameState({ ...ctx, tiles: tilesNoCluster }, 'p1'))
  })

  it('retorna 0 si el jugador está eliminado', () => {
    const ctx = makeCtx({
      players: {
        p1: { ...makeCtx().players['p1'], isEliminated: true, credits: 0 },
        p2: makeCtx().players['p2'],
      },
    })
    expect(scoreGameState(ctx, 'p1')).toBe(0)
  })

  it('penaliza jugador con tiles bajo asedio', () => {
    const ctx = makeCtx()
    const ids = cyanIds(ctx)
    const noSiege = { ...ctx.tiles, [ids[0]]: { ...ctx.tiles[ids[0]], ownerId: 'p1' } }
    const withSiege = { ...noSiege, [ids[0]]: { ...noSiege[ids[0]], isUnderSiege: true, siegeByPlayerId: 'p2' } }
    expect(scoreGameState({ ...ctx, tiles: withSiege }, 'p1'))
      .toBeLessThan(scoreGameState({ ...ctx, tiles: noSiege }, 'p1'))
  })
})

// ── chooseIntent ──────────────────────────────────────────────────────────────

describe('chooseIntent — fase rolling', () => {
  it('siempre retorna ROLL_DICE en fase rolling', () => {
    const ctx = makeCtx({ phase: 'rolling' })
    const intent = chooseIntent(ctx, 'p1')
    expect(intent.type).toBe('ROLL_DICE')
  })
})

describe('chooseIntent — fase choosing_path', () => {
  it('retorna CHOOSE_PATH con algún path disponible', () => {
    const ctx = makeCtx({
      phase: 'choosing_path',
      diceValue: 1,
      availablePaths: [
        ['1,0,-1'] as TileId[],
        ['0,1,-1'] as TileId[],
      ],
    })
    const intent = chooseIntent(ctx, 'p1')
    expect(intent.type).toBe('CHOOSE_PATH')
    if (intent.type === 'CHOOSE_PATH') {
      expect(intent.path.length).toBeGreaterThan(0)
    }
  })

  it('prefiere paths hacia tiles sin dueño (comprables)', () => {
    const ctx = makeCtx({ phase: 'choosing_path', diceValue: 1 })
    const ids = cyanIds(ctx)
    // ids[0] sin dueño (comprable), ids[1] con dueño (renta)
    const tiles = { ...ctx.tiles, [ids[1]]: { ...ctx.tiles[ids[1]], ownerId: 'p2' } }
    const available: TileId[][] = [[ids[0]], [ids[1]]]
    const result = chooseIntent({ ...ctx, tiles, availablePaths: available }, 'p1')
    expect(result.type).toBe('CHOOSE_PATH')
    if (result.type === 'CHOOSE_PATH') {
      expect(result.path[result.path.length - 1]).toBe(ids[0])
    }
  })
})

describe('chooseIntent — fase buying', () => {
  it('compra si tiene créditos suficientes y la propiedad vale la pena', () => {
    const ctx = makeCtx({ phase: 'buying' })
    const ids = cyanIds(ctx)
    const tiles = { ...ctx.tiles }
    // Mover p1 al tile cyan y el tile sin dueño
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], currentTileId: ids[0], credits: 800 } }
    const intent = chooseIntent({ ...ctx, tiles, players }, 'p1')
    // Con 800💰 y baseCost 100 → debe comprar
    expect(intent.type).toBe('BUY_PROPERTY')
  })

  it('pasa si los créditos están por debajo del umbral seguro (3× el costo)', () => {
    const ctx = makeCtx({ phase: 'buying' })
    const ids = cyanIds(ctx)
    // baseCost de cyan = 100, jugador tiene 250💰 (< 3×100=300)
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], currentTileId: ids[0], credits: 250 } }
    const intent = chooseIntent({ ...ctx, players }, 'p1')
    expect(intent.type).toBe('SKIP_BUY')
  })
})

describe('chooseIntent — fase paying_rent', () => {
  it('paga con créditos si tiene suficientes y son abundantes', () => {
    const ctx = makeCtx({ phase: 'paying_rent' })
    const ids = cyanIds(ctx)
    const tiles = { ...ctx.tiles, [ids[0]]: { ...ctx.tiles[ids[0]], ownerId: 'p2' } }
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], currentTileId: ids[0], credits: 900, energy: 2 } }
    const intent = chooseIntent({ ...ctx, tiles, players }, 'p1')
    expect(intent.type).toBe('PAY_RENT_CREDITS')
  })

  it('paga con energía si los créditos son escasos', () => {
    const ctx = makeCtx({ phase: 'paying_rent' })
    const ids = cyanIds(ctx)
    const tiles = { ...ctx.tiles, [ids[0]]: { ...ctx.tiles[ids[0]], ownerId: 'p2' } }
    // Solo 50💰 y mucha energía
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], currentTileId: ids[0], credits: 50, energy: 15 } }
    const intent = chooseIntent({ ...ctx, tiles, players }, 'p1')
    expect(intent.type).toBe('PAY_RENT_ENERGY')
  })
})

describe('chooseIntent — fase stasis_choice', () => {
  it('intenta liberarse con créditos si los tiene', () => {
    const ctx = makeCtx({ phase: 'stasis_choice' })
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], credits: 200, energy: 10 } }
    const intent = chooseIntent({ ...ctx, players }, 'p1')
    expect(['PAY_STASIS', 'SKIP_STASIS']).toContain(intent.type)
  })

  it('pierde el turno si no tiene recursos para liberarse', () => {
    const ctx = makeCtx({ phase: 'stasis_choice' })
    const players = { ...ctx.players, p1: { ...ctx.players['p1'], credits: 0, energy: 0 } }
    const intent = chooseIntent({ ...ctx, players }, 'p1')
    expect(intent.type).toBe('SKIP_STASIS')
  })
})
