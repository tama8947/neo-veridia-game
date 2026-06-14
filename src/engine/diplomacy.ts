import type { GameContext } from './schemas'
import { PNA_DURATION_TURNS, PNA_BREACH_PENALTY } from './constants'

export function hasPna(ctx: GameContext, p1: string, p2: string): boolean {
  return ctx.players[p1]?.activePnas.some(
    pna => pna.withPlayerId === p2 && !pna.broken && pna.turnsLeft > 0
  ) ?? false
}

export function proposePna(ctx: GameContext, proposerId: string, targetId: string): GameContext {
  if (proposerId === targetId) throw new Error('Cannot propose PNA with yourself')
  if (hasPna(ctx, proposerId, targetId)) throw new Error('PNA already active between players')

  // Store proposal as a pending PNA with turnsLeft = 0 (not yet accepted)
  // We use lastEvent as the signal channel — actual PNA activates on acceptPna
  return {
    ...ctx,
    lastEvent: {
      id: `pna_proposal_${proposerId}_${targetId}`,
      name: `Propuesta de PNA: ${proposerId} → ${targetId}`,
      effectKey: `PNA_PROPOSAL:${proposerId}:${targetId}`,
      probability: 0,
    },
  }
}

export function acceptPna(ctx: GameContext, acceptorId: string, proposerId: string): GameContext {
  const pna = { withPlayerId: '', turnsLeft: PNA_DURATION_TURNS, broken: false }
  return {
    ...ctx,
    players: {
      ...ctx.players,
      [proposerId]: {
        ...ctx.players[proposerId],
        activePnas: [
          ...ctx.players[proposerId].activePnas,
          { ...pna, withPlayerId: acceptorId },
        ],
      },
      [acceptorId]: {
        ...ctx.players[acceptorId],
        activePnas: [
          ...ctx.players[acceptorId].activePnas,
          { ...pna, withPlayerId: proposerId },
        ],
      },
    },
    lastEvent: undefined,
  }
}

export function rejectPna(ctx: GameContext, _rejectorId: string, _proposerId: string): GameContext {
  return { ...ctx, lastEvent: undefined }
}

export function tickPnas(ctx: GameContext): GameContext {
  const players = { ...ctx.players }
  for (const pid of Object.keys(players)) {
    const updated = players[pid].activePnas
      .map(pna => ({ ...pna, turnsLeft: pna.turnsLeft - 1 }))
      .filter(pna => pna.turnsLeft > 0 || pna.broken)
      // Remove expired non-broken PNAs
      .filter(pna => pna.broken || pna.turnsLeft > 0)
    players[pid] = { ...players[pid], activePnas: updated }
  }
  return { ...ctx, players }
}

export function breakPna(ctx: GameContext, breakerId: string, targetId: string): GameContext {
  if (!hasPna(ctx, breakerId, targetId)) throw new Error('No active PNA to break')

  const players = { ...ctx.players }
  const breaker = players[breakerId]

  players[breakerId] = {
    ...breaker,
    energy: Math.max(0, breaker.energy - PNA_BREACH_PENALTY),
    activePnas: breaker.activePnas.map(pna =>
      pna.withPlayerId === targetId ? { ...pna, broken: true } : pna
    ),
  }

  players[targetId] = {
    ...players[targetId],
    activePnas: players[targetId].activePnas.map(pna =>
      pna.withPlayerId === breakerId ? { ...pna, broken: true } : pna
    ),
  }

  return { ...ctx, players }
}
