import type { Tile, TileId, PropertyColor } from './schemas'
import { TILE_BASE_COSTS, TILE_BASE_RENTS } from './constants'

// ── Hex coordinate helpers ───────────────────────────────────────────────────

export function tileIdFromCoords(q: number, r: number, s: number): TileId {
  return `${q},${r},${s}`
}

export function coordsFromTileId(id: TileId): { q: number; r: number; s: number } {
  const [q, r, s] = id.split(',').map(Number)
  return { q, r, s }
}

// Standard cube coordinate directions (redblobgames)
const HEX_DIRECTIONS = [
  [1, 0, -1], [1, -1, 0], [0, -1, 1],
  [-1, 0, 1], [-1, 1, 0], [0, 1, -1],
] as const

export function getNeighbors(id: TileId, board: Record<TileId, Tile>): TileId[] {
  const { q, r, s } = coordsFromTileId(id)
  return HEX_DIRECTIONS
    .map(([dq, dr, ds]) => tileIdFromCoords(q + dq, r + dr, s + ds))
    .filter(neighborId => neighborId in board)
}

export function isAdjacentTo(a: TileId, b: TileId): boolean {
  const { q: q1, r: r1 } = coordsFromTileId(a)
  const { q: q2, r: r2 } = coordsFromTileId(b)
  return HEX_DIRECTIONS.some(([dq, dr]) => q1 + dq === q2 && r1 + dr === r2)
}

// ── Ring builder (standard hex ring algorithm) ───────────────────────────────
// Start at direction(4)*radius = (-R, R, 0), walk 6 sides of R steps each

function buildRing(radius: number): { q: number; r: number; s: number }[] {
  if (radius === 0) return [{ q: 0, r: 0, s: 0 }]
  const tiles: { q: number; r: number; s: number }[] = []
  let q = -radius, r = radius, s = 0
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      tiles.push({ q, r, s })
      const [dq, dr, ds] = HEX_DIRECTIONS[i]
      q += dq; r += dr; s += ds
    }
  }
  return tiles  // produces exactly 6*radius tiles
}

// ── Board layout ─────────────────────────────────────────────────────────────
// 37 tiles total: 1 nucleus + 24 properties (8 colors × 3) + 12 specials
//
// Ring 1 (6 tiles):  cyan×3, sky×3
// Ring 2 (12 tiles): lime×3, emerald×3 + 2 stasis + 2 guild_event + 2 portal_alpha
// Ring 3 (18 tiles): amber×3, orange×3, rose×3, fuchsia×3 + 3 stasis + 2 guild_event + 2 portal_beta + 1 dark_district
//
// Special positions are by index within each ring to ensure symmetry

function makeProperty(id: TileId, color: PropertyColor): Tile {
  return {
    id, type: 'property', color,
    baseRent: TILE_BASE_RENTS[color],
    baseCost: TILE_BASE_COSTS[color],
    upgradeLevel: 0, isMortgaged: false, isUnderSiege: false,
  }
}

function makeSpecial(id: TileId, type: Tile['type'], portalGroupId?: string): Tile {
  return {
    id, type,
    baseRent: 0, baseCost: 0,
    upgradeLevel: 0, isMortgaged: false, isUnderSiege: false,
    ...(portalGroupId ? { portalGroupId } : {}),
  }
}

export function buildBoard(): Record<TileId, Tile> {
  const board: Record<TileId, Tile> = {}

  // Nucleus
  board['0,0,0'] = makeSpecial('0,0,0', 'nucleus')

  // Ring 1: cyan (i=0,1,2) sky (i=3,4,5)
  const ring1 = buildRing(1)
  const ring1Colors: PropertyColor[] = ['cyan', 'cyan', 'cyan', 'sky', 'sky', 'sky']
  ring1.forEach(({ q, r, s }, i) => {
    const id = tileIdFromCoords(q, r, s)
    board[id] = makeProperty(id, ring1Colors[i])
  })

  // Ring 2: property / special interleaved
  // Indices: 0=stasis, 1=lime, 2=lime, 3=lime, 4=guild_event, 5=emerald,
  //          6=portal_alpha, 7=emerald, 8=emerald, 9=stasis, 10=guild_event, 11=emerald
  // Wait — emerald needs 3 tiles. Let me assign carefully:
  // lime: indices 1,2,3  emerald: indices 5,7,8  specials: 0,4,6,9,10 = 5 specials
  // That's 5 specials + 6 properties = 11... need 12.
  // Revised: 4 specials + 8 properties in ring 2, but only 6 are lime/emerald×3
  // Actually let's use: 2 stasis + 2 guild_event + 1 portal + 1 portal = 6 specials + 6 properties
  // Indices: 0=stasis, 1=lime, 2=lime, 3=lime, 4=guild_event, 5=emerald
  //          6=portal, 7=emerald, 8=emerald, 9=stasis, 10=guild_event, 11=portal
  const ring2 = buildRing(2)
  type R2Entry = { type: 'property'; color: PropertyColor } | { type: 'stasis' | 'guild_event' | 'portal'; portalGroup?: string }
  const ring2Layout: R2Entry[] = [
    { type: 'stasis' },
    { type: 'property', color: 'lime' },
    { type: 'property', color: 'lime' },
    { type: 'property', color: 'lime' },
    { type: 'guild_event' },
    { type: 'property', color: 'emerald' },
    { type: 'portal', portalGroup: 'alpha' },
    { type: 'property', color: 'emerald' },
    { type: 'property', color: 'emerald' },
    { type: 'stasis' },
    { type: 'guild_event' },
    { type: 'portal', portalGroup: 'alpha' },
  ]
  ring2.forEach(({ q, r, s }, i) => {
    const id = tileIdFromCoords(q, r, s)
    const entry = ring2Layout[i]
    board[id] = entry.type === 'property'
      ? makeProperty(id, entry.color)
      : makeSpecial(id, entry.type, 'portalGroup' in entry ? entry.portalGroup : undefined)
  })

  // Ring 3: 12 properties (amber×3, orange×3, rose×3, fuchsia×3) + 6 specials
  // 18 total: 3 stasis + 2 guild_event + 2 portal_beta + 1 dark_district = 8... too many
  // 12 properties + 6 specials = 18 ✓: 2 stasis + 2 guild_event + 1 portal_beta_1 + 1 portal_beta_2 = 6
  // Actually need 12 property + 6 special = 18 ✓
  const ring3 = buildRing(3)
  type R3Entry = { type: 'property'; color: PropertyColor } | { type: 'stasis' | 'guild_event' | 'portal' | 'dark_district'; portalGroup?: string }
  const ring3Layout: R3Entry[] = [
    { type: 'property', color: 'amber' },
    { type: 'property', color: 'amber' },
    { type: 'stasis' },
    { type: 'property', color: 'amber' },
    { type: 'property', color: 'orange' },
    { type: 'property', color: 'orange' },
    { type: 'portal', portalGroup: 'beta' },
    { type: 'property', color: 'orange' },
    { type: 'property', color: 'rose' },
    { type: 'guild_event' },
    { type: 'property', color: 'rose' },
    { type: 'property', color: 'rose' },
    { type: 'stasis' },
    { type: 'property', color: 'fuchsia' },
    { type: 'property', color: 'fuchsia' },
    { type: 'portal', portalGroup: 'beta' },
    { type: 'dark_district' },
    { type: 'property', color: 'fuchsia' },
  ]
  ring3.forEach(({ q, r, s }, i) => {
    const id = tileIdFromCoords(q, r, s)
    const entry = ring3Layout[i]
    board[id] = entry.type === 'property'
      ? makeProperty(id, entry.color)
      : makeSpecial(id, entry.type, 'portalGroup' in entry ? entry.portalGroup : undefined)
  })

  return board
}

// ── Siege detection ───────────────────────────────────────────────────────────

export function detectSiege(
  tileId: TileId,
  attackerId: string,
  board: Record<TileId, Tile>,
  players: Record<string, { id: string; currentTileId: TileId; characterSlug: string; isEliminated: boolean }>,
): boolean {
  const tile = board[tileId]
  if (!tile || tile.type !== 'property' || tile.ownerId === attackerId) return false

  const owner = Object.values(players).find(p => p.id === tile.ownerId)
  if (owner?.characterSlug === 'la-sombra-cuantica') return false

  const neighbors = getNeighbors(tileId, board)
  const attackerTokensAdjacent = Object.values(players).filter(
    p => p.id === attackerId && !p.isEliminated && neighbors.includes(p.currentTileId)
  ).length

  return attackerTokensAdjacent >= 2
}
