import { describe, it, expect } from 'vitest'
import { buildBoard, getNeighbors, tileIdFromCoords, coordsFromTileId, isAdjacentTo } from '../board'

describe('tileIdFromCoords / coordsFromTileId', () => {
  it('convierte coords a TileId y viceversa de forma simétrica', () => {
    const id = tileIdFromCoords(1, -2, 1)
    expect(id).toBe('1,-2,1')
    expect(coordsFromTileId(id)).toEqual({ q: 1, r: -2, s: 1 })
  })

  it('TileId del núcleo es 0,0,0', () => {
    expect(tileIdFromCoords(0, 0, 0)).toBe('0,0,0')
  })
})

describe('buildBoard', () => {
  const board = buildBoard()

  it('genera exactamente 37 tiles', () => {
    expect(Object.keys(board).length).toBe(37)
  })

  it('el tile 0,0,0 es el núcleo', () => {
    expect(board['0,0,0'].type).toBe('nucleus')
  })

  it('todos los tiles tienen upgradeLevel 0 al inicio', () => {
    const allZero = Object.values(board).every(t => t.upgradeLevel === 0)
    expect(allZero).toBe(true)
  })

  it('todos los tiles no están hipotecados al inicio', () => {
    const allFalse = Object.values(board).every(t => t.isMortgaged === false)
    expect(allFalse).toBe(true)
  })

  it('todos los tiles tienen TileId válido en formato q,r,s con q+r+s=0', () => {
    Object.keys(board).forEach(id => {
      const { q, r, s } = coordsFromTileId(id)
      expect(q + r + s).toBe(0)
    })
  })

  it('los tiles de propiedad tienen color asignado', () => {
    const properties = Object.values(board).filter(t => t.type === 'property')
    expect(properties.length).toBeGreaterThan(0)
    properties.forEach(t => expect(t.color).toBeDefined())
  })

  it('cada color presente en el tablero aparece exactamente 3 veces', () => {
    const properties = Object.values(board).filter(t => t.type === 'property')
    const byColor = properties.reduce<Record<string, number>>((acc, t) => {
      acc[t.color!] = (acc[t.color!] ?? 0) + 1
      return acc
    }, {})
    Object.values(byColor).forEach(count => expect(count).toBe(3))
  })

  it('hay al menos 2 portales en el tablero', () => {
    const portals = Object.values(board).filter(t => t.type === 'portal')
    expect(portals.length).toBeGreaterThanOrEqual(2)
  })

  it('hay al menos 2 zonas de stasis en el tablero', () => {
    const stasis = Object.values(board).filter(t => t.type === 'stasis')
    expect(stasis.length).toBeGreaterThanOrEqual(2)
  })
})

describe('getNeighbors', () => {
  const board = buildBoard()

  it('el núcleo tiene exactamente 6 vecinos', () => {
    const neighbors = getNeighbors('0,0,0', board)
    expect(neighbors.length).toBe(6)
  })

  it('todos los vecinos existen en el tablero', () => {
    const neighbors = getNeighbors('0,0,0', board)
    neighbors.forEach(id => expect(board[id]).toBeDefined())
  })

  it('los tiles del borde exterior tienen menos de 6 vecinos', () => {
    // Tile en el anillo 3 (borde) debe tener < 6 vecinos dentro del tablero
    const borderTiles = Object.keys(board).filter(id => {
      const { q, r, s } = coordsFromTileId(id)
      return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) === 3
    })
    expect(borderTiles.length).toBeGreaterThan(0)
    const borderNeighbors = getNeighbors(borderTiles[0], board)
    expect(borderNeighbors.length).toBeLessThan(6)
  })

  it('la relación de vecindad es simétrica', () => {
    const neighborsOfNucleus = getNeighbors('0,0,0', board)
    neighborsOfNucleus.forEach(neighborId => {
      const neighborsOfNeighbor = getNeighbors(neighborId, board)
      expect(neighborsOfNeighbor).toContain('0,0,0')
    })
  })
})
