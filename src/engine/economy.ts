import type { GameContext, Tile, TileId } from './schemas'
import {
  UPGRADE_COSTS,
  UPGRADE_RENT_MULTIPLIERS,
  CLUSTER_RENT_MULTIPLIER,
  MORTGAGE_RATIO,
  PROPERTIES_PER_COLOR,
} from './constants'

export function upgradeCost(currentLevel: 0 | 1 | 2 | 3): number {
  if (currentLevel >= 3) return 0
  return UPGRADE_COSTS[(currentLevel + 1) as 1 | 2 | 3]
}

export function mortgageValue(tile: Tile): number {
  return Math.floor(tile.baseCost * MORTGAGE_RATIO)
}

export function checkCluster(
  tiles: Record<TileId, Tile>,
  playerId: string,
  color: string,
): boolean {
  const colorTiles = Object.values(tiles).filter(t => t.color === color)
  if (colorTiles.length !== PROPERTIES_PER_COLOR) return false
  return colorTiles.every(t => t.ownerId === playerId && !t.isMortgaged)
}

export function calculateRent(ctx: GameContext, tileId: TileId): number {
  const tile = ctx.tiles[tileId]
  if (!tile.ownerId || tile.isMortgaged) return 0

  let rent = tile.baseRent

  // Apply upgrade multiplier
  rent = Math.floor(rent * UPGRADE_RENT_MULTIPLIERS[tile.upgradeLevel])

  // Apply cluster bonus
  if (tile.color && checkCluster(ctx.tiles, tile.ownerId, tile.color)) {
    rent = Math.floor(rent * CLUSTER_RENT_MULTIPLIER)
  }

  // Apply global effects
  const hasRentIncrease25 = ctx.globalEffects.some(e => e.key === 'RENT_INCREASE_25')
  if (hasRentIncrease25) {
    rent = Math.floor(rent * 1.25)
  }

  return rent
}

export function applyUpgrade(ctx: GameContext, playerId: string, tileId: TileId): GameContext {
  const tile = ctx.tiles[tileId]
  const player = ctx.players[playerId]

  if (tile.ownerId !== playerId) throw new Error('Tile does not belong to player')
  if (tile.upgradeLevel >= 3) throw new Error('Tile is already at maximum upgrade level')
  if (tile.isMortgaged) throw new Error('Cannot upgrade a mortgaged tile')
  if (tile.isUnderSiege) throw new Error('Cannot upgrade a tile under siege')

  const cost = upgradeCost(tile.upgradeLevel)
  if (player.energy < cost) throw new Error('Insufficient energy to upgrade')

  const newLevel = (tile.upgradeLevel + 1) as 0 | 1 | 2 | 3

  return {
    ...ctx,
    tiles: {
      ...ctx.tiles,
      [tileId]: { ...tile, upgradeLevel: newLevel },
    },
    players: {
      ...ctx.players,
      [playerId]: { ...player, energy: player.energy - cost },
    },
  }
}

export function applyMortgage(ctx: GameContext, playerId: string, tileId: TileId): GameContext {
  const tile = ctx.tiles[tileId]
  const player = ctx.players[playerId]

  if (tile.ownerId !== playerId) throw new Error('Tile does not belong to player')
  if (tile.isMortgaged) throw new Error('Tile is already mortgaged')

  const value = mortgageValue(tile)

  return {
    ...ctx,
    tiles: {
      ...ctx.tiles,
      [tileId]: { ...tile, isMortgaged: true },
    },
    players: {
      ...ctx.players,
      [playerId]: { ...player, credits: player.credits + value },
    },
  }
}
