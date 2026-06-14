import type { GameContext } from '@/engine/schemas'

// Compact replay frame — only the fields needed for playback
export interface ReplayFrame {
  turn:    number
  phase:   string
  players: Record<string, {
    credits:       number
    energy:        number
    currentTileId: string
    isEliminated:  boolean
    isInStasis:    boolean
  }>
  // Only tiles with ownerId or upgradeLevel > 0 (sparse)
  tiles: Record<string, {
    ownerId?:    string
    upgradeLevel: number
    isMortgaged: boolean
    isUnderSiege: boolean
  }>
  diceValue?: number
}

export function extractReplayFrame(ctx: GameContext): ReplayFrame {
  const players: ReplayFrame['players'] = {}
  for (const [id, p] of Object.entries(ctx.players)) {
    players[id] = {
      credits:       p.credits,
      energy:        p.energy,
      currentTileId: p.currentTileId,
      isEliminated:  p.isEliminated,
      isInStasis:    p.isInStasis,
    }
  }

  // Only serialize non-default tiles (owned, upgraded, mortgaged or under siege)
  const tiles: ReplayFrame['tiles'] = {}
  for (const [id, t] of Object.entries(ctx.tiles)) {
    if (t.ownerId || t.upgradeLevel > 0 || t.isMortgaged || t.isUnderSiege) {
      tiles[id] = {
        ownerId:      t.ownerId,
        upgradeLevel: t.upgradeLevel,
        isMortgaged:  t.isMortgaged,
        isUnderSiege: t.isUnderSiege,
      }
    }
  }

  return {
    turn:      ctx.currentTurn,
    phase:     ctx.phase,
    players,
    tiles,
    diceValue: ctx.diceValue,
  }
}

// Returns human-readable diff labels between two frames
export function diffFrames(a: ReplayFrame, b: ReplayFrame): string[] {
  const diffs: string[] = []

  if (a.phase !== b.phase) diffs.push(`phase: ${a.phase} → ${b.phase}`)
  if (a.turn  !== b.turn)  diffs.push(`turn: ${a.turn} → ${b.turn}`)

  for (const pid of Object.keys({ ...a.players, ...b.players })) {
    const pa = a.players[pid]
    const pb = b.players[pid]
    if (!pa || !pb) continue
    if (pa.credits !== pb.credits)
      diffs.push(`${pid}.credits: ${pa.credits} → ${pb.credits}`)
    if (pa.energy !== pb.energy)
      diffs.push(`${pid}.energy: ${pa.energy} → ${pb.energy}`)
    if (pa.currentTileId !== pb.currentTileId)
      diffs.push(`${pid}.currentTileId: ${pa.currentTileId} → ${pb.currentTileId}`)
    if (pa.isEliminated !== pb.isEliminated)
      diffs.push(`${pid}.isEliminated: ${pb.isEliminated}`)
  }

  for (const tid of Object.keys({ ...a.tiles, ...b.tiles })) {
    const ta = a.tiles[tid]
    const tb = b.tiles[tid]
    if (JSON.stringify(ta) !== JSON.stringify(tb)) {
      diffs.push(`tile.${tid}: changed`)
    }
  }

  return diffs
}
