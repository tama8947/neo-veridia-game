import type { GameContext, TileId } from './schemas'
import { AUCTION_TIMER_MS } from './constants'

export function startAuction(ctx: GameContext, tileId: TileId): GameContext {
  if (ctx.auction?.active) throw new Error('An auction is already active')
  const tile = ctx.tiles[tileId]
  if (tile.ownerId) throw new Error('Cannot auction an owned tile')

  return {
    ...ctx,
    phase: 'auction',
    auction: {
      tileId,
      bids: {},
      timerMs: AUCTION_TIMER_MS,
      active: true,
    },
  }
}

export function placeBid(ctx: GameContext, playerId: string, tileId: TileId, amount: number): GameContext {
  if (!ctx.auction?.active) throw new Error('No active auction')
  const player = ctx.players[playerId]
  const currentBid = ctx.auction.bids[playerId] ?? 0

  if (amount > player.credits) throw new Error('Insufficient credits to place bid')
  if (amount <= currentBid) throw new Error('New bid must be higher than current bid')

  return {
    ...ctx,
    auction: {
      ...ctx.auction,
      bids: { ...ctx.auction.bids, [playerId]: amount },
    },
  }
}

export function resolveAuction(ctx: GameContext): GameContext {
  if (!ctx.auction?.active) throw new Error('No active auction')

  const { tileId, bids } = ctx.auction
  const entries = Object.entries(bids) as [string, number][]

  if (entries.length === 0) {
    return { ...ctx, auction: undefined }
  }

  const [winnerId, winningBid] = entries.reduce(
    (best, curr) => curr[1] > best[1] ? curr : best
  )

  return {
    ...ctx,
    tiles: {
      ...ctx.tiles,
      [tileId]: { ...ctx.tiles[tileId], ownerId: winnerId },
    },
    players: {
      ...ctx.players,
      [winnerId]: {
        ...ctx.players[winnerId],
        credits: ctx.players[winnerId].credits - winningBid,
      },
    },
    auction: undefined,
  }
}
