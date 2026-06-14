import { describe, it, expect } from 'vitest'
import { buildBoard } from '../board'
import { createInitialContext } from '../game-machine'
import { extractReplayFrame, diffFrames } from '../../lib/replay'
import type { GameContext, TileId } from '../schemas'

function makeCtx(): GameContext {
  return createInitialContext([
    { id: 'p1', userId: 'u1', characterSlug: 'el-arquitecto' },
    { id: 'p2', userId: 'u2', characterSlug: 'la-mercader' },
  ])
}

describe('extractReplayFrame', () => {
  it('extrae un frame con turn, phase, players y tiles resumidos', () => {
    const ctx = makeCtx()
    const frame = extractReplayFrame(ctx)
    expect(frame.turn).toBe(1)
    expect(frame.phase).toBe('rolling')
    expect(frame.players).toBeDefined()
    expect(frame.tiles).toBeDefined()
  })

  it('el frame es más pequeño que el contexto completo (compresión)', () => {
    const ctx = makeCtx()
    const frame = extractReplayFrame(ctx)
    // Frame only stores changed/relevant fields
    const frameSize = JSON.stringify(frame).length
    const ctxSize   = JSON.stringify(ctx).length
    expect(frameSize).toBeLessThan(ctxSize)
  })

  it('players en frame incluyen id, credits, energy y currentTileId', () => {
    const ctx = makeCtx()
    const frame = extractReplayFrame(ctx)
    const p1 = frame.players['p1']
    expect(p1.credits).toBe(1500)
    expect(p1.energy).toBe(10)
    expect(p1.currentTileId).toBe('0,0,0')
  })
})

describe('diffFrames', () => {
  it('retorna array vacío si los frames son idénticos', () => {
    const ctx = makeCtx()
    const frame = extractReplayFrame(ctx)
    expect(diffFrames(frame, frame)).toHaveLength(0)
  })

  it('detecta cambio en créditos de un jugador', () => {
    const ctx1 = makeCtx()
    const ctx2 = {
      ...ctx1,
      players: { ...ctx1.players, p1: { ...ctx1.players['p1'], credits: 1400 } },
    }
    const diff = diffFrames(extractReplayFrame(ctx1), extractReplayFrame(ctx2))
    expect(diff.some(d => d.includes('p1') && d.includes('credits'))).toBe(true)
  })

  it('detecta cambio de fase', () => {
    const ctx1 = makeCtx()
    const ctx2 = { ...ctx1, phase: 'buying' as const }
    const diff = diffFrames(extractReplayFrame(ctx1), extractReplayFrame(ctx2))
    expect(diff.some(d => d.includes('phase'))).toBe(true)
  })
})
