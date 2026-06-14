import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import {
  proposePna, acceptPna, rejectPna,
  tickPnas, hasPna, breakPna,
} from '../diplomacy'
import type { GameContext, TileId } from '../schemas'

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  return {
    tiles: buildBoard(),
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
        credits: 500, energy: 8, currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
      p2: {
        id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
        credits: 400, energy: 6, currentTileId: '0,0,0' as TileId,
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

describe('proposePna', () => {
  it('no modifica activePnas aún (propuesta pendiente no es PNA activo)', () => {
    const ctx = makeCtx()
    const result = proposePna(ctx, 'p1', 'p2')
    // La propuesta queda en lastEvent o pendingPna — los jugadores no tienen PNA hasta aceptar
    expect(result.players['p1'].activePnas).toHaveLength(0)
    expect(result.players['p2'].activePnas).toHaveLength(0)
  })

  it('lanza error si el proponente intenta pactar consigo mismo', () => {
    const ctx = makeCtx()
    expect(() => proposePna(ctx, 'p1', 'p1')).toThrow()
  })

  it('lanza error si ya existe un PNA activo entre los dos jugadores', () => {
    const ctx = makeCtx()
    const accepted = acceptPna(proposePna(ctx, 'p1', 'p2'), 'p2', 'p1')
    expect(() => proposePna(accepted, 'p1', 'p2')).toThrow()
  })
})

describe('acceptPna', () => {
  it('agrega PNA activo (5 turnos) a ambos jugadores', () => {
    const ctx = makeCtx()
    const proposed = proposePna(ctx, 'p1', 'p2')
    const result = acceptPna(proposed, 'p2', 'p1')
    const p1Pna = result.players['p1'].activePnas.find(p => p.withPlayerId === 'p2')
    const p2Pna = result.players['p2'].activePnas.find(p => p.withPlayerId === 'p1')
    expect(p1Pna?.turnsLeft).toBe(5)
    expect(p2Pna?.turnsLeft).toBe(5)
    expect(p1Pna?.broken).toBe(false)
    expect(p2Pna?.broken).toBe(false)
  })
})

describe('rejectPna', () => {
  it('no crea PNA (no hay cambio en activePnas)', () => {
    const ctx = makeCtx()
    const proposed = proposePna(ctx, 'p1', 'p2')
    const result = rejectPna(proposed, 'p2', 'p1')
    expect(result.players['p1'].activePnas).toHaveLength(0)
    expect(result.players['p2'].activePnas).toHaveLength(0)
  })
})

describe('hasPna', () => {
  it('retorna true si existe PNA activo y no roto entre los jugadores', () => {
    const ctx = makeCtx()
    const result = acceptPna(proposePna(ctx, 'p1', 'p2'), 'p2', 'p1')
    expect(hasPna(result, 'p1', 'p2')).toBe(true)
    expect(hasPna(result, 'p2', 'p1')).toBe(true)
  })

  it('retorna false si no hay PNA', () => {
    const ctx = makeCtx()
    expect(hasPna(ctx, 'p1', 'p2')).toBe(false)
  })

  it('retorna false si el PNA está roto', () => {
    const ctx = makeCtx()
    const withPna = acceptPna(proposePna(ctx, 'p1', 'p2'), 'p2', 'p1')
    const broken = breakPna(withPna, 'p1', 'p2')
    expect(hasPna(broken, 'p1', 'p2')).toBe(false)
  })
})

describe('tickPnas', () => {
  it('decrementa turnsLeft de todos los PNAs activos', () => {
    const ctx = makeCtx()
    const withPna = acceptPna(proposePna(ctx, 'p1', 'p2'), 'p2', 'p1')
    const ticked = tickPnas(withPna)
    const p1Pna = ticked.players['p1'].activePnas.find(p => p.withPlayerId === 'p2')
    expect(p1Pna?.turnsLeft).toBe(4)
  })

  it('elimina PNAs con turnsLeft === 0 después del tick', () => {
    const ctx = makeCtx()
    const withPna = acceptPna(proposePna(ctx, 'p1', 'p2'), 'p2', 'p1')
    // Tick 5 veces
    let result = withPna
    for (let i = 0; i < 5; i++) result = tickPnas(result)
    expect(result.players['p1'].activePnas).toHaveLength(0)
    expect(result.players['p2'].activePnas).toHaveLength(0)
  })
})

describe('breakPna', () => {
  it('marca el PNA como roto y cobra 3⚡ al que lo rompe', () => {
    const ctx = makeCtx()
    const withPna = acceptPna(proposePna(ctx, 'p1', 'p2'), 'p2', 'p1')
    const result = breakPna(withPna, 'p1', 'p2')
    const p1Pna = result.players['p1'].activePnas.find(p => p.withPlayerId === 'p2')
    expect(p1Pna?.broken).toBe(true)
    expect(result.players['p1'].energy).toBe(5) // 8 - 3
  })

  it('lanza error si no hay PNA activo entre los jugadores', () => {
    const ctx = makeCtx()
    expect(() => breakPna(ctx, 'p1', 'p2')).toThrow()
  })
})
