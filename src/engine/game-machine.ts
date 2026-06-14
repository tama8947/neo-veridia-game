import { setup, assign, createActor } from 'xstate'
import type { GameContext, GameIntent, TileId } from './schemas'
import { buildBoard } from './board'
import { computePaths } from './pathfinding'
import { calculateRent, applyUpgrade, applyMortgage } from './economy'
import { GUILD_EVENT_DECK, drawGuildEvent, applyGuildEvent } from './events'
import { tickPnas } from './diplomacy'
import { startAuction, resolveAuction } from './auction'
import {
  NUCLEUS_CREDITS_BONUS, NUCLEUS_ENERGY_BONUS, ENERGY_REGEN_PER_TURN,
  STASIS_COST_CREDITS, STASIS_COST_ENERGY,
  STARTING_CREDITS, STARTING_ENERGY, MAX_TURNS, COUNTDOWN_TURNS, COUNTDOWN_EVENTS,
  GUILD_RESCUE_CREDITS, RENT_ENERGY_RATIO,
} from './constants'

// ── Initial context factory ───────────────────────────────────────────────────

export function createInitialContext(
  playerEntries: Array<{ id: string; userId: string; characterSlug: string }>,
): GameContext {
  return {
    tiles: buildBoard(),
    players: Object.fromEntries(
      playerEntries.map(p => [p.id, {
        id: p.id, userId: p.userId, characterSlug: p.characterSlug,
        credits: STARTING_CREDITS, energy: STARTING_ENERGY,
        currentTileId: '0,0,0' as TileId,
        isEliminated: false, isInStasis: false, stasisTurnsLeft: 0,
        activePnas: [], xpEarned: 0,
      }])
    ),
    turnOrder: playerEntries.map(p => p.id),
    currentPlayerIndex: 0,
    currentTurn: 1,
    maxTurns: MAX_TURNS,
    phase: 'rolling',
    globalEffects: [],
    log: [],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentPlayer(ctx: GameContext) {
  return ctx.players[ctx.turnOrder[ctx.currentPlayerIndex]]
}

function activePlayers(ctx: GameContext) {
  return ctx.turnOrder.filter(id => !ctx.players[id].isEliminated)
}

// ── XState Machine ───────────────────────────────────────────────────────────

export const gameMachine = setup({
  types: {} as { context: GameContext; events: GameIntent & { senderId?: string } },

  guards: {
    isCurrentPlayer: ({ context }, params: { senderId: string }) =>
      context.turnOrder[context.currentPlayerIndex] === params.senderId,

    canBuyProperty: ({ context }) => {
      const player = currentPlayer(context)
      const tile = context.tiles[player.currentTileId]
      return tile?.type === 'property' && !tile.ownerId && player.credits >= tile.baseCost
    },

    mustPayRent: ({ context }) => {
      const player = currentPlayer(context)
      const tile = context.tiles[player.currentTileId]
      return !!(tile?.type === 'property' && tile.ownerId && tile.ownerId !== player.id && !tile.isMortgaged)
    },

    isOnOwnProperty: ({ context }) => {
      const player = currentPlayer(context)
      const tile = context.tiles[player.currentTileId]
      return tile?.type === 'property' && tile.ownerId === player.id
    },

    canAffordRentCredits: ({ context }) => {
      const player = currentPlayer(context)
      const rent = calculateRent(context, player.currentTileId)
      return player.credits >= rent
    },

    canAffordRentEnergy: ({ context }) => {
      const player = currentPlayer(context)
      const rent = calculateRent(context, player.currentTileId)
      return player.energy >= Math.ceil(rent / RENT_ENERGY_RATIO)
    },

    isBankrupt: ({ context }) => {
      const player = currentPlayer(context)
      const ownedTiles = Object.values(context.tiles).filter(
        t => t.ownerId === player.id && !t.isMortgaged
      )
      return player.credits <= 0 && ownedTiles.length === 0
    },

    isTurnLimit: ({ context }) =>
      context.currentTurn >= context.maxTurns,

    isCountdownTurn: ({ context }) =>
      (COUNTDOWN_TURNS as readonly number[]).includes(context.currentTurn),

    hasActiveElimination: ({ context }) =>
      activePlayers(context).length === 1,
  },

  actions: {
    rollDice: assign(({ context }) => {
      const diceValue = (Math.ceil(Math.random() * 6)) as 1 | 2 | 3 | 4 | 5 | 6
      const ctxWithDice = { ...context, diceValue }
      return {
        diceValue,
        phase: 'choosing_path' as const,
        availablePaths: computePaths(ctxWithDice, context.turnOrder[context.currentPlayerIndex]),
      }
    }),

    movePlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'CHOOSE_PATH') return context.players
        const path = (event as { type: 'CHOOSE_PATH'; path: TileId[] }).path
        const playerId = context.turnOrder[context.currentPlayerIndex]
        return {
          ...context.players,
          [playerId]: {
            ...context.players[playerId],
            currentTileId: path[path.length - 1],
          },
        }
      },
      diceValue: undefined,
      availablePaths: undefined,
      phase: 'landing' as const,
    }),

    collectNucleus: assign({
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        return {
          ...context.players,
          [playerId]: {
            ...player,
            credits: player.credits + NUCLEUS_CREDITS_BONUS,
            energy: player.energy + NUCLEUS_ENERGY_BONUS,
            xpEarned: player.xpEarned,
          },
        }
      },
    }),

    chargeRentCredits: assign({
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        const tile = context.tiles[player.currentTileId]
        const rent = calculateRent(context, player.currentTileId)
        const ownerId = tile.ownerId!
        return {
          ...context.players,
          [playerId]: { ...player, credits: player.credits - rent },
          [ownerId]: { ...context.players[ownerId], credits: context.players[ownerId].credits + rent },
        }
      },
    }),

    chargeRentEnergy: assign({
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        const tile = context.tiles[player.currentTileId]
        const rent = calculateRent(context, player.currentTileId)
        const energyCost = Math.ceil(rent / RENT_ENERGY_RATIO)
        const ownerId = tile.ownerId!
        return {
          ...context.players,
          [playerId]: { ...player, energy: player.energy - energyCost },
          [ownerId]: { ...context.players[ownerId], credits: context.players[ownerId].credits + rent },
        }
      },
    }),

    buyProperty: assign({
      tiles: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        const tileId = player.currentTileId
        return {
          ...context.tiles,
          [tileId]: { ...context.tiles[tileId], ownerId: playerId },
        }
      },
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        const tile = context.tiles[player.currentTileId]
        return {
          ...context.players,
          [playerId]: {
            ...player,
            credits: player.credits - tile.baseCost,
            xpEarned: player.xpEarned,
          },
        }
      },
    }),

    applyStasis: assign({
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        return {
          ...context.players,
          [playerId]: {
            ...context.players[playerId],
            isInStasis: true,
            stasisTurnsLeft: 1,
          },
        }
      },
    }),

    payStasis: assign({
      players: ({ context, event }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        const method = (event as { type: 'PAY_STASIS'; method: 'credits' | 'energy' }).method
        return {
          ...context.players,
          [playerId]: {
            ...player,
            isInStasis: false,
            stasisTurnsLeft: 0,
            credits: method === 'credits' ? player.credits - STASIS_COST_CREDITS : player.credits,
            energy: method === 'energy' ? player.energy - STASIS_COST_ENERGY : player.energy,
          },
        }
      },
    }),

    eliminatePlayer: assign({
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        return {
          ...context.players,
          [playerId]: { ...context.players[playerId], isEliminated: true, credits: 0 },
        }
      },
      tiles: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        return Object.fromEntries(
          Object.entries(context.tiles).map(([id, tile]) =>
            tile.ownerId === playerId
              ? [id, { ...tile, ownerId: undefined, upgradeLevel: 0 as const, isMortgaged: false }]
              : [id, tile]
          )
        )
      },
    }),

    regenEnergy: assign({
      players: ({ context }) => {
        const regenAmount = ctx_energyRegen(context)
        return Object.fromEntries(
          Object.entries(context.players).map(([id, p]) =>
            p.isEliminated ? [id, p] : [id, { ...p, energy: p.energy + regenAmount }]
          )
        )
      },
    }),

    advanceTurn: assign({
      currentPlayerIndex: ({ context }) => {
        let next = (context.currentPlayerIndex + 1) % context.turnOrder.length
        while (context.players[context.turnOrder[next]]?.isEliminated) {
          next = (next + 1) % context.turnOrder.length
        }
        return next
      },
      currentTurn: ({ context }) => context.currentTurn + 1,
      phase: 'rolling' as const,
    }),

    applyCountdownEvent: assign({
      globalEffects: ({ context }) => {
        const eventKey = COUNTDOWN_EVENTS[context.currentTurn as keyof typeof COUNTDOWN_EVENTS]
        if (!eventKey) return context.globalEffects
        if (context.currentTurn === 20) {
          return [...context.globalEffects, { key: 'RENT_INCREASE_25' }]
        }
        if (context.currentTurn === 35) {
          return [...context.globalEffects, { key: 'ENERGY_CRISIS', turnsLeft: undefined }]
        }
        return context.globalEffects
      },
    }),

    upgradeProperty: assign(({ context, event }) => {
      const tileId = (event as { type: 'UPGRADE_PROPERTY'; tileId: TileId }).tileId
      const playerId = context.turnOrder[context.currentPlayerIndex]
      return applyUpgrade(context, playerId, tileId)
    }),

    mortgageProperty: assign(({ context, event }) => {
      const tileId = (event as { type: 'MORTGAGE_PROPERTY'; tileId: TileId }).tileId
      const playerId = context.turnOrder[context.currentPlayerIndex]
      return applyMortgage(context, playerId, tileId)
    }),

    guildRescue: assign({
      players: ({ context }) => {
        const playerId = context.turnOrder[context.currentPlayerIndex]
        const player = context.players[playerId]
        return {
          ...context.players,
          [playerId]: { ...player, credits: player.credits + GUILD_RESCUE_CREDITS },
        }
      },
    }),

    drawAndApplyGuildEvent: assign(({ context }) => {
      const card = drawGuildEvent(GUILD_EVENT_DECK)
      return applyGuildEvent({ ...context, lastEvent: card }, card)
    }),

    tickAllPnas: assign(({ context }) => tickPnas(context)),

    startFinalAuction: assign(({ context }) => {
      const unownedTile = Object.entries(context.tiles).find(
        ([, t]) => t.type === 'property' && !t.ownerId
      )
      if (!unownedTile) return context
      return startAuction(context, unownedTile[0] as import('./schemas').TileId)
    }),

    resolveCurrentAuction: assign(({ context }) => {
      if (!context.auction?.active) return context
      return resolveAuction(context)
    }),

    addLog: assign({
      log: ({ context, event }) => [
        ...context.log,
        {
          turn: context.currentTurn,
          playerId: context.turnOrder[context.currentPlayerIndex],
          action: event.type,
          timestamp: Date.now(),
        },
      ],
    }),
  },
}).createMachine({
  id: 'hexestate',
  initial: 'rolling',
  context: createInitialContext([]),

  on: {
    UPGRADE_PROPERTY:  { actions: ['upgradeProperty', 'addLog'] },
    MORTGAGE_PROPERTY: { actions: ['mortgageProperty', 'addLog'] },
  },

  states: {
    rolling: {
      on: {
        ROLL_DICE: {
          actions: 'rollDice',
          target: 'choosing_path',
        },
      },
    },

    choosing_path: {
      on: {
        CHOOSE_PATH: {
          actions: 'movePlayer',
          target: 'landing',
        },
      },
    },

    landing: {
      always: [
        {
          guard: 'isTurnLimit',
          target: 'finished',
        },
        {
          guard: 'hasActiveElimination',
          target: 'finished',
        },
        {
          guard: ({ context }) => context.tiles[currentPlayer(context).currentTileId]?.type === 'nucleus',
          actions: 'collectNucleus',
          target: 'end_turn',
        },
        {
          guard: 'canBuyProperty',
          target: 'buying',
        },
        {
          guard: 'mustPayRent',
          target: 'paying_rent',
        },
        {
          guard: ({ context }) => context.tiles[currentPlayer(context).currentTileId]?.type === 'stasis',
          target: 'stasis_choice',
        },
        {
          guard: ({ context }) => context.tiles[currentPlayer(context).currentTileId]?.type === 'guild_event',
          target: 'guild_event',
        },
        {
          guard: 'isOnOwnProperty',
          target: 'end_turn',
        },
        { target: 'end_turn' },
      ],
    },

    buying: {
      on: {
        BUY_PROPERTY: { actions: ['buyProperty', 'addLog'], target: 'end_turn' },
        SKIP_BUY:     { target: 'end_turn' },
      },
    },

    paying_rent: {
      always: [
        { guard: 'isBankrupt', actions: 'eliminatePlayer', target: 'landing' },
      ],
      on: {
        PAY_RENT_CREDITS: {
          guard: 'canAffordRentCredits',
          actions: ['chargeRentCredits', 'addLog'],
          target: 'end_turn',
        },
        PAY_RENT_ENERGY: {
          guard: 'canAffordRentEnergy',
          actions: ['chargeRentEnergy', 'addLog'],
          target: 'end_turn',
        },
      },
    },

    stasis_choice: {
      on: {
        PAY_STASIS: { actions: ['payStasis', 'addLog'], target: 'end_turn' },
        SKIP_STASIS: { actions: ['applyStasis', 'addLog'], target: 'end_turn' },
      },
    },

    guild_event: {
      entry: 'drawAndApplyGuildEvent',
      on: {
        GUILD_RESCUE: { actions: ['guildRescue', 'addLog'], target: 'end_turn' },
      },
      after: { 500: { target: 'end_turn' } },
    },

    end_turn: {
      entry: ['regenEnergy', 'tickAllPnas', 'advanceTurn'],
      always: [
        { guard: 'isCountdownTurn', actions: 'applyCountdownEvent', target: 'rolling' },
        { target: 'rolling' },
      ],
    },

    finished: {
      type: 'final',
    },
  },
})

function ctx_energyRegen(ctx: GameContext): number {
  if (ctx.globalEffects.some(e => e.key === 'ENERGY_CRISIS')) return 1
  return ENERGY_REGEN_PER_TURN
}

export function createGameActor(players: Array<{ id: string; userId: string; characterSlug: string }>) {
  return createActor(gameMachine, {
    input: createInitialContext(players),
  })
}
