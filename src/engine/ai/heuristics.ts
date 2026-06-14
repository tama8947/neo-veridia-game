import type { GameContext } from '../schemas'
import { checkCluster } from '../economy'

// Weights for the heuristic score
const W = {
  CREDITS:     1.0,   // per credit
  ENERGY:      15.0,  // energy is scarce — worth ~15 credits each
  PROPERTY:    40.0,  // per owned property
  CLUSTER:     200.0, // per completed cluster
  UPGRADE:     25.0,  // per upgrade level above 0
  SIEGE_PEN:  -60.0,  // per tile under siege (vulnerability)
  MORTGAGE_PEN: -20.0, // per mortgaged tile (lost income)
  STASIS_PEN: -80.0,  // being in stasis is very bad
  TURN_BONUS:  0.5,   // surviving each turn
}

export function scoreGameState(ctx: GameContext, playerId: string): number {
  const player = ctx.players[playerId]
  if (!player || player.isEliminated) return 0

  let score = 0

  // Resources
  score += player.credits * W.CREDITS
  score += player.energy * W.ENERGY

  // Stasis penalty
  if (player.isInStasis) score += W.STASIS_PEN * player.stasisTurnsLeft

  const ownedTiles = Object.values(ctx.tiles).filter(t => t.ownerId === playerId)
  const ownedColors = [...new Set(ownedTiles.map(t => t.color).filter(Boolean))] as string[]

  // Properties
  score += ownedTiles.length * W.PROPERTY

  // Upgrades
  for (const tile of ownedTiles) {
    score += tile.upgradeLevel * W.UPGRADE
    if (tile.isMortgaged) score += W.MORTGAGE_PEN
    if (tile.isUnderSiege) score += W.SIEGE_PEN
  }

  // Clusters
  for (const color of ownedColors) {
    if (checkCluster(ctx.tiles, playerId, color)) {
      score += W.CLUSTER
    }
  }

  // Survival bonus (turns survived)
  score += ctx.currentTurn * W.TURN_BONUS

  // Relative advantage over opponents
  const opponents = ctx.turnOrder.filter(pid => pid !== playerId && !ctx.players[pid].isEliminated)
  for (const oppId of opponents) {
    const opp = ctx.players[oppId]
    score += (player.credits - opp.credits) * 0.1
  }

  return score
}

// Score a specific tile as a destination for movement
export function scoreTile(ctx: GameContext, playerId: string, tileId: string): number {
  const tile = ctx.tiles[tileId as import('../schemas').TileId]
  if (!tile) return 0

  const player = ctx.players[playerId]
  let score = 0

  switch (tile.type) {
    case 'nucleus':
      // Nucleus = guaranteed credits + energy
      score += 200 + 30
      break

    case 'property':
      if (!tile.ownerId) {
        // Unowned: buying opportunity
        if (player.credits >= tile.baseCost * 3) {
          score += tile.baseRent * 8 // income potential
          // Bonus if we already own tiles of same color
          const owned = Object.values(ctx.tiles).filter(t => t.ownerId === playerId && t.color === tile.color)
          score += owned.length * 60
        } else {
          score += tile.baseRent * 2 // lower if can't afford safely
        }
      } else if (tile.ownerId === playerId) {
        score += 10 // own property: neutral, small bonus
      } else {
        // Opponent's tile: will pay rent → negative
        const rent = tile.baseRent * (tile.upgradeLevel > 0 ? [1, 1.5, 2, 3][tile.upgradeLevel] : 1)
        score -= rent * (tile.isMortgaged ? 0 : 1.5)
      }
      break

    case 'guild_event':
      score += 30 // uncertain but potentially positive
      break

    case 'portal':
      score += 15 // mobility advantage
      break

    case 'stasis':
      score -= 120 // very bad
      break

    case 'dark_district':
      score -= 50
      break
  }

  return score
}
