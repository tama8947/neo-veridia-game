import type { GameContext, GameIntent, TileId } from '../schemas'
import { scoreTile } from './heuristics'
import { evaluateBuy, evaluateRent, bestAction } from './minimax'
import { calculateRent } from '../economy'
import { STASIS_COST_CREDITS, STASIS_COST_ENERGY } from '../constants'

// Returns the best intent for the AI player given the current game context.
// Designed for VS_AI game mode — called by PartyKit when the AI's turn arrives.
export function chooseIntent(ctx: GameContext, playerId: string): GameIntent {
  const { phase } = ctx
  const player = ctx.players[playerId]

  switch (phase) {
    case 'rolling':
      return { type: 'ROLL_DICE' }

    case 'choosing_path':
      return choosePath(ctx, playerId)

    case 'buying':
      return chooseBuy(ctx, playerId)

    case 'paying_rent':
      return chooseRentPayment(ctx, playerId)

    case 'stasis_choice':
      return chooseStasis(ctx, playerId)

    case 'guild_event':
      return { type: 'GUILD_RESCUE' }

    case 'auction':
      return chooseAuctionBid(ctx, playerId)

    default:
      // Fallback — should not normally be reached
      return { type: 'ROLL_DICE' }
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function choosePath(ctx: GameContext, playerId: string): GameIntent {
  const paths = ctx.availablePaths ?? []
  if (paths.length === 0) {
    // No paths — shouldn't happen, but return first tile as fallback
    return { type: 'CHOOSE_PATH', path: [ctx.players[playerId].currentTileId] }
  }

  // Score each path by its destination tile
  const scored = paths.map(path => ({
    path,
    score: scoreTile(ctx, playerId, path[path.length - 1]),
  }))

  const best = scored.reduce((a, b) => b.score > a.score ? b : a)
  return { type: 'CHOOSE_PATH', path: best.path }
}

function chooseBuy(ctx: GameContext, playerId: string): GameIntent {
  const player = ctx.players[playerId]
  const tileId = player.currentTileId
  const tile = ctx.tiles[tileId]

  if (!tile || tile.ownerId || tile.type !== 'property') {
    return { type: 'SKIP_BUY' }
  }

  // Safety threshold: keep at least 3× the tile cost in reserve
  if (player.credits < tile.baseCost * 3) {
    return { type: 'SKIP_BUY' }
  }

  // ROI check: expected income > cost (assumes ~30% chance per turn of opponent landing)
  const remainingTurns = ctx.maxTurns - ctx.currentTurn
  const expectedIncome = tile.baseRent * remainingTurns * 0.3
  if (expectedIncome < tile.baseCost * 0.4) {
    return { type: 'SKIP_BUY' }
  }

  return { type: 'BUY_PROPERTY', tileId }
}

function chooseRentPayment(ctx: GameContext, playerId: string): GameIntent {
  const player = ctx.players[playerId]
  const rent = calculateRent(ctx, player.currentTileId)
  const energyCost = Math.ceil(rent / 20)

  const canPayCredits = player.credits >= rent
  const canPayEnergy  = player.energy  >= energyCost

  if (!canPayCredits && !canPayEnergy) {
    return { type: 'PAY_RENT_CREDITS' } // machine handles bankruptcy
  }

  if (!canPayCredits) return { type: 'PAY_RENT_ENERGY' }
  if (!canPayEnergy)  return { type: 'PAY_RENT_CREDITS' }

  // Conserve energy if scarce (energy < 5 → pay credits)
  if (player.energy < 5) return { type: 'PAY_RENT_CREDITS' }

  // Conserve credits if scarce (credits < 200 → pay energy)
  if (player.credits < 200) return { type: 'PAY_RENT_ENERGY' }

  // Both abundant: use evaluation
  const actions = evaluateRent(ctx, playerId)
  const best = bestAction(actions)
  if (!best) return { type: 'PAY_RENT_CREDITS' }

  return best.action === 'PAY_ENERGY'
    ? { type: 'PAY_RENT_ENERGY' }
    : { type: 'PAY_RENT_CREDITS' }
}

function chooseStasis(ctx: GameContext, playerId: string): GameIntent {
  const player = ctx.players[playerId]

  // Prefer energy (preserve credits for buying)
  if (player.energy >= STASIS_COST_ENERGY) {
    return { type: 'PAY_STASIS', method: 'energy' }
  }
  if (player.credits >= STASIS_COST_CREDITS) {
    return { type: 'PAY_STASIS', method: 'credits' }
  }
  return { type: 'SKIP_STASIS' }
}

function chooseAuctionBid(ctx: GameContext, playerId: string): GameIntent {
  if (!ctx.auction?.active) return { type: 'ROLL_DICE' }

  const player = ctx.players[playerId]
  const tile = ctx.tiles[ctx.auction.tileId]
  if (!tile) return { type: 'ROLL_DICE' }

  // Bid up to 70% of credits or 120% of baseCost, whichever is lower
  const maxBid = Math.min(
    Math.floor(player.credits * 0.7),
    Math.floor(tile.baseCost * 1.2),
  )

  const currentBid = ctx.auction.bids[playerId] ?? 0
  const topBid = Math.max(0, ...Object.values(ctx.auction.bids))

  // Bid slightly above current top, up to maxBid
  const bid = Math.min(maxBid, topBid + Math.ceil(tile.baseCost * 0.1))

  if (bid <= currentBid || bid <= 0 || bid > player.credits) {
    // Can't outbid — pass (no "pass" intent, so just don't send; in practice skip via timeout)
    return { type: 'ROLL_DICE' } // dummy — auction resolves by timer
  }

  return { type: 'PLACE_AUCTION_BID', tileId: ctx.auction.tileId, amount: bid }
}
