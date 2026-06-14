import type { GameContext, GuildEventCard, TileId } from './schemas'

export const GUILD_EVENT_DECK: GuildEventCard[] = [
  { id: 'gc_01', name: 'Subsidio Gremial',       effectKey: 'BONUS_CREDITS',      probability: 0.12 },
  { id: 'gc_02', name: 'Pulso de Energía',        effectKey: 'ENERGY_BURST',       probability: 0.10 },
  { id: 'gc_03', name: 'Impuesto Redistributivo', effectKey: 'CREDITS_TAX',        probability: 0.08 },
  { id: 'gc_04', name: 'Saqueo Energético',       effectKey: 'STEAL_ENERGY',       probability: 0.08 },
  { id: 'gc_05', name: 'Escudo Gremial',          effectKey: 'GUILD_PROTECTION',   probability: 0.08 },
  { id: 'gc_06', name: 'Mejora Gratuita',         effectKey: 'UPGRADE_FREE',       probability: 0.08 },
  { id: 'gc_07', name: 'Mercado Oscuro',          effectKey: 'DARK_MARKET',        probability: 0.08 },
  { id: 'gc_08', name: 'Surgimiento de Portales', effectKey: 'PORTAL_SURGE',       probability: 0.08 },
  { id: 'gc_09', name: 'Transferencia Forzada',   effectKey: 'CREDITS_TRANSFER',   probability: 0.08 },
  { id: 'gc_10', name: 'Propiedad Liberada',      effectKey: 'PROPERTY_GRANT',     probability: 0.06 },
  { id: 'gc_11', name: 'Regeneración Acelerada',  effectKey: 'ENERGY_REGEN_BONUS', probability: 0.06 },
  { id: 'gc_12', name: 'Congelación de Rentas',   effectKey: 'RENT_FREEZE',        probability: 0.06 },
  { id: 'gc_13', name: 'Bonificación de XP',      effectKey: 'XP_BONUS',          probability: 0.04 },
]

export function drawGuildEvent(deck: GuildEventCard[]): GuildEventCard {
  const roll = Math.random()
  let cumulative = 0
  for (const card of deck) {
    cumulative += card.probability
    if (roll < cumulative) return card
  }
  return deck[deck.length - 1]
}

export function applyGuildEvent(ctx: GameContext, card: GuildEventCard): GameContext {
  const currentPlayerId = ctx.turnOrder[ctx.currentPlayerIndex]

  switch (card.effectKey) {
    case 'BONUS_CREDITS': {
      const player = ctx.players[currentPlayerId]
      return {
        ...ctx,
        players: { ...ctx.players, [currentPlayerId]: { ...player, credits: player.credits + 100 } },
      }
    }

    case 'ENERGY_BURST': {
      const player = ctx.players[currentPlayerId]
      return {
        ...ctx,
        players: { ...ctx.players, [currentPlayerId]: { ...player, energy: player.energy + 5 } },
      }
    }

    case 'CREDITS_TAX': {
      const taxPerPlayer: Record<string, number> = {}
      let pool = 0
      for (const pid of ctx.turnOrder) {
        const tax = Math.floor(ctx.players[pid].credits * 0.1)
        taxPerPlayer[pid] = tax
        pool += tax
      }
      const players = { ...ctx.players }
      for (const pid of ctx.turnOrder) {
        players[pid] = { ...players[pid], credits: players[pid].credits - taxPerPlayer[pid] }
      }
      players[currentPlayerId] = {
        ...players[currentPlayerId],
        credits: players[currentPlayerId].credits + pool,
      }
      return { ...ctx, players }
    }

    case 'STEAL_ENERGY': {
      const opponents = ctx.turnOrder.filter(pid => pid !== currentPlayerId && !ctx.players[pid].isEliminated)
      const players = { ...ctx.players }
      let stolen = 0
      for (const pid of opponents) {
        const steal = Math.min(1, players[pid].energy)
        players[pid] = { ...players[pid], energy: players[pid].energy - steal }
        stolen += steal
      }
      players[currentPlayerId] = {
        ...players[currentPlayerId],
        energy: players[currentPlayerId].energy + stolen,
      }
      return { ...ctx, players }
    }

    case 'GUILD_PROTECTION': {
      return {
        ...ctx,
        globalEffects: [...ctx.globalEffects, { key: 'GUILD_PROTECTION', turnsLeft: 1 }],
      }
    }

    case 'UPGRADE_FREE': {
      const owned = Object.entries(ctx.tiles).find(
        ([, t]) => t.ownerId === currentPlayerId && t.upgradeLevel < 3 && !t.isMortgaged
      )
      if (!owned) return ctx
      const [tileId, tile] = owned
      return {
        ...ctx,
        tiles: {
          ...ctx.tiles,
          [tileId]: { ...tile, upgradeLevel: (tile.upgradeLevel + 1) as 0 | 1 | 2 | 3 },
        },
      }
    }

    case 'DARK_MARKET': {
      return { ...ctx, globalEffects: [...ctx.globalEffects, { key: 'DARK_MARKET', turnsLeft: 1 }] }
    }

    case 'PORTAL_SURGE': {
      return { ...ctx, globalEffects: [...ctx.globalEffects, { key: 'PORTAL_SURGE', turnsLeft: 3 }] }
    }

    case 'CREDITS_TRANSFER': {
      const richest = ctx.turnOrder
        .filter(pid => !ctx.players[pid].isEliminated && pid !== currentPlayerId)
        .sort((a, b) => ctx.players[b].credits - ctx.players[a].credits)[0]

      if (!richest || ctx.players[richest].credits <= ctx.players[currentPlayerId].credits) {
        return ctx
      }
      const transfer = Math.min(50, ctx.players[richest].credits)
      return {
        ...ctx,
        players: {
          ...ctx.players,
          [richest]: { ...ctx.players[richest], credits: ctx.players[richest].credits - transfer },
          [currentPlayerId]: { ...ctx.players[currentPlayerId], credits: ctx.players[currentPlayerId].credits + transfer },
        },
      }
    }

    case 'PROPERTY_GRANT': {
      const unowned = Object.entries(ctx.tiles).find(
        ([, t]) => t.type === 'property' && !t.ownerId
      )
      if (!unowned) return ctx
      const [tileId, tile] = unowned
      return {
        ...ctx,
        tiles: { ...ctx.tiles, [tileId]: { ...tile, ownerId: currentPlayerId } },
      }
    }

    case 'ENERGY_REGEN_BONUS': {
      return { ...ctx, globalEffects: [...ctx.globalEffects, { key: 'ENERGY_REGEN_BONUS', turnsLeft: 3 }] }
    }

    case 'RENT_FREEZE': {
      return { ...ctx, globalEffects: [...ctx.globalEffects, { key: 'RENT_FREEZE', turnsLeft: 2 }] }
    }

    case 'XP_BONUS': {
      const player = ctx.players[currentPlayerId]
      return {
        ...ctx,
        players: { ...ctx.players, [currentPlayerId]: { ...player, xpEarned: player.xpEarned + 50 } },
      }
    }

    default:
      return ctx
  }
}
