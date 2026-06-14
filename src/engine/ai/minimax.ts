import type { GameContext, TileId } from '../schemas'
import { scoreGameState } from './heuristics'
import { calculateRent, applyUpgrade, applyMortgage } from '../economy'
import { UPGRADE_COSTS } from '../constants'

// Depth-limited lookahead — not a true minimax (game is multi-player + stochastic),
// but uses the same "maximize self, minimize average opponent" principle.

export interface ScoredAction {
  score:  number
  action: string
  meta?:  Record<string, unknown>
}

// Simulate the outcome of buying vs skipping a property
export function evaluateBuy(ctx: GameContext, playerId: string, tileId: TileId): ScoredAction[] {
  const player = ctx.players[playerId]
  const tile = ctx.tiles[tileId]

  // Option 1: Buy
  const ctxBought: GameContext = {
    ...ctx,
    tiles: { ...ctx.tiles, [tileId]: { ...tile, ownerId: playerId } },
    players: {
      ...ctx.players,
      [playerId]: { ...player, credits: player.credits - tile.baseCost },
    },
  }

  // Option 2: Skip
  const actions: ScoredAction[] = [
    { score: scoreGameState(ctxBought, playerId), action: 'BUY' },
    { score: scoreGameState(ctx, playerId),        action: 'SKIP' },
  ]
  return actions
}

// Evaluate upgrade opportunities for a player's tiles
export function evaluateUpgrades(ctx: GameContext, playerId: string): ScoredAction[] {
  const results: ScoredAction[] = []
  const player = ctx.players[playerId]

  for (const [id, tile] of Object.entries(ctx.tiles)) {
    if (tile.ownerId !== playerId) continue
    if (tile.upgradeLevel >= 3 || tile.isMortgaged || tile.isUnderSiege) continue

    const cost = UPGRADE_COSTS[(tile.upgradeLevel + 1) as 1 | 2 | 3]
    if (player.energy < cost) continue

    try {
      const upgraded = applyUpgrade(ctx, playerId, id as TileId)
      results.push({
        score:  scoreGameState(upgraded, playerId),
        action: 'UPGRADE',
        meta:   { tileId: id },
      })
    } catch {
      // skip invalid upgrades
    }
  }

  return results
}

// Evaluate mortgage options
export function evaluateMortgages(ctx: GameContext, playerId: string): ScoredAction[] {
  const results: ScoredAction[] = []

  for (const [id, tile] of Object.entries(ctx.tiles)) {
    if (tile.ownerId !== playerId || tile.isMortgaged) continue
    if (tile.upgradeLevel > 0) continue // don't mortgage upgraded tiles

    try {
      const mortgaged = applyMortgage(ctx, playerId, id as TileId)
      results.push({
        score:  scoreGameState(mortgaged, playerId),
        action: 'MORTGAGE',
        meta:   { tileId: id },
      })
    } catch {
      // skip
    }
  }

  return results
}

// Evaluate rent payment options
export function evaluateRent(ctx: GameContext, playerId: string): ScoredAction[] {
  const player = ctx.players[playerId]
  const rent = calculateRent(ctx, player.currentTileId)
  const energyCost = Math.ceil(rent / 20)
  const results: ScoredAction[] = []

  if (player.credits >= rent) {
    const ctxPaidCredits: GameContext = {
      ...ctx,
      players: { ...ctx.players, [playerId]: { ...player, credits: player.credits - rent } },
    }
    results.push({ score: scoreGameState(ctxPaidCredits, playerId), action: 'PAY_CREDITS' })
  }

  if (player.energy >= energyCost) {
    const ctxPaidEnergy: GameContext = {
      ...ctx,
      players: { ...ctx.players, [playerId]: { ...player, energy: player.energy - energyCost } },
    }
    results.push({ score: scoreGameState(ctxPaidEnergy, playerId), action: 'PAY_ENERGY' })
  }

  return results
}

export function bestAction(actions: ScoredAction[]): ScoredAction | null {
  if (actions.length === 0) return null
  return actions.reduce((best, curr) => curr.score > best.score ? curr : best)
}
