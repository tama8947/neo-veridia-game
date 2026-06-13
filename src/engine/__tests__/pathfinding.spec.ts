import { describe, it, expect } from 'vitest'
import { buildBoard, getNeighbors } from '../board'
import { computePaths, isValidPath } from '../pathfinding'
import type { GameContext } from '../schemas'

const board = buildBoard()

function makeContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    tiles: board,
    players: {
      p1: {
        id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
        credits: 1500, energy: 10, currentTileId: '0,0,0',
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      },
    },
    turnOrder: ['p1'],
    currentPlayerIndex: 0,
    currentTurn: 1,
    maxTurns: 40,
    phase: 'choosing_path',
    diceValue: 2,
    globalEffects: [],
    log: [],
    ...overrides,
  } as GameContext
}

describe('computePaths', () => {
  it('retorna paths de exactamente diceValue pasos', () => {
    const ctx = makeContext({ diceValue: 2 })
    const paths = computePaths(ctx, 'p1')
    paths.forEach(path => expect(path.length).toBe(2))
  })

  it('retorna al menos 1 path cuando el jugador puede moverse', () => {
    const ctx = makeContext({ diceValue: 1 })
    const paths = computePaths(ctx, 'p1')
    expect(paths.length).toBeGreaterThan(0)
  })

  it('cada tile en el path es vecino del anterior', () => {
    const ctx = makeContext({ diceValue: 3 })
    const paths = computePaths(ctx, 'p1')
    paths.forEach(path => {
      for (let i = 1; i < path.length; i++) {
        const neighbors = getNeighbors(path[i - 1], board)
        expect(neighbors).toContain(path[i])
      }
    })
  })

  it('excluye tiles con otro jugador ocupándolos en posición intermedia', () => {
    const ctx = makeContext({
      diceValue: 2,
      players: {
        p1: {
          id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
          credits: 1500, energy: 10, currentTileId: '0,0,0',
          isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
          activePnas: [], xpEarned: 0,
        },
        p2: {
          id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
          credits: 1500, energy: 10, currentTileId: '1,0,-1',
          isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
          activePnas: [], xpEarned: 0,
        },
      },
      turnOrder: ['p1', 'p2'],
    })
    const paths = computePaths(ctx, 'p1')
    // Ningún path debe pasar por '1,0,-1' como paso intermedio
    paths.forEach(path => {
      if (path.length > 1) {
        path.slice(0, -1).forEach(tileId => expect(tileId).not.toBe('1,0,-1'))
      }
    })
  })

  it('no retorna paths duplicados', () => {
    const ctx = makeContext({ diceValue: 2 })
    const paths = computePaths(ctx, 'p1')
    const unique = new Set(paths.map(p => p.join(',')))
    expect(unique.size).toBe(paths.length)
  })
})

describe('isValidPath', () => {
  it('acepta path cuya longitud === diceValue', () => {
    const ctx = makeContext({ diceValue: 2 })
    const paths = computePaths(ctx, 'p1')
    if (paths.length > 0) {
      expect(isValidPath(ctx, 'p1', paths[0])).toBe(true)
    }
  })

  it('rechaza path con longitud !== diceValue', () => {
    const ctx = makeContext({ diceValue: 3 })
    expect(isValidPath(ctx, 'p1', ['1,0,-1'])).toBe(false)
  })

  it('rechaza path con tiles no adyacentes', () => {
    const ctx = makeContext({ diceValue: 2 })
    // '0,0,0' y '3,0,-3' no son adyacentes
    expect(isValidPath(ctx, 'p1', ['0,0,0', '3,0,-3'])).toBe(false)
  })

  it('rechaza path que incluye tile con jugador rival en posición intermedia', () => {
    const ctx = makeContext({
      diceValue: 2,
      players: {
        p1: {
          id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto',
          credits: 1500, energy: 10, currentTileId: '0,0,0',
          isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
          activePnas: [], xpEarned: 0,
        },
        p2: {
          id: 'p2', userId: 'u2', characterSlug: 'la-mercader',
          credits: 1500, energy: 10, currentTileId: '1,0,-1',
          isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
          activePnas: [], xpEarned: 0,
        },
      },
      turnOrder: ['p1', 'p2'],
    })
    // path de 2 pasos donde el primer paso es la posición del rival
    expect(isValidPath(ctx, 'p1', ['1,0,-1', '2,0,-2'])).toBe(false)
  })
})
