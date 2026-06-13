import type { GameContext, TileId } from './schemas'
import { getNeighbors, isAdjacentTo } from './board'

// ── Occupied tiles (other players) ───────────────────────────────────────────

function getOccupiedBy(ctx: GameContext, excludePlayerId: string): Set<TileId> {
  return new Set(
    Object.values(ctx.players)
      .filter(p => p.id !== excludePlayerId && !p.isEliminated)
      .map(p => p.currentTileId)
  )
}

function canTraverseTile(
  tileId: TileId,
  playerId: string,
  occupied: Set<TileId>,
  characterSlug: string,
): boolean {
  if (!occupied.has(tileId)) return true
  // El Fantasma del Vapor puede atravesar tiles ocupados
  if (characterSlug === 'el-fantasma-del-vapor') return true
  return false
}

// ── BFS pathfinding ───────────────────────────────────────────────────────────
// Returns all valid paths of exactly `steps` moves from current position.
// A path is represented as an array of tileIds NOT including the start tile.

export function computePaths(ctx: GameContext, playerId: string): TileId[][] {
  const player = ctx.players[playerId]
  if (!player) return []

  const steps = ctx.diceValue ?? 1
  const occupied = getOccupiedBy(ctx, playerId)
  const characterSlug = player.characterSlug

  // BFS with depth = steps
  // State: { path: TileId[] (from start, excluding start), depth }
  const results: TileId[][] = []
  const queue: { tileId: TileId; path: TileId[] }[] = [
    { tileId: player.currentTileId, path: [] },
  ]

  while (queue.length > 0) {
    const { tileId, path } = queue.shift()!

    if (path.length === steps) {
      results.push(path)
      continue
    }

    const neighbors = getNeighbors(tileId, ctx.tiles)
    for (const neighborId of neighbors) {
      const isLastStep = path.length === steps - 1
      // Can land on occupied tile only if it's the final destination (attacker blocks intermediate)
      const canEnter = isLastStep
        ? true  // can land anywhere (even occupied) as final tile
        : canTraverseTile(neighborId, playerId, occupied, characterSlug)

      if (canEnter) {
        queue.push({ tileId: neighborId, path: [...path, neighborId] })
      }
    }
  }

  // Deduplicate by final destination (keep first path found to each destination)
  const seen = new Set<TileId>()
  return results.filter(path => {
    const dest = path[path.length - 1]
    if (seen.has(dest)) return false
    seen.add(dest)
    return true
  })
}

// ── Validation ────────────────────────────────────────────────────────────────

export function isValidPath(ctx: GameContext, playerId: string, path: TileId[]): boolean {
  const player = ctx.players[playerId]
  if (!player) return false

  const steps = ctx.diceValue ?? 1

  // Must have exactly diceValue tiles
  if (path.length !== steps) return false

  // First tile must be adjacent to current position
  if (!isAdjacentTo(player.currentTileId, path[0])) return false

  // Consecutive tiles must be adjacent
  for (let i = 1; i < path.length; i++) {
    if (!isAdjacentTo(path[i - 1], path[i])) return false
  }

  // All tiles must exist in the board
  for (const tileId of path) {
    if (!ctx.tiles[tileId]) return false
  }

  // Intermediate tiles (not the last one) cannot be occupied by another player
  // (unless El Fantasma del Vapor)
  const occupied = getOccupiedBy(ctx, playerId)
  const characterSlug = player.characterSlug
  for (let i = 0; i < path.length - 1; i++) {
    if (!canTraverseTile(path[i], playerId, occupied, characterSlug)) return false
  }

  return true
}
