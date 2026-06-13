'use client'

import { useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { gameMachine, createInitialContext } from '@/engine/game-machine'
import type { TileId } from '@/engine/schemas'

const DEMO_PLAYERS = [
  { id: 'p1', userId: 'demo-1', characterSlug: 'el-arquitecto' },
  { id: 'p2', userId: 'demo-2', characterSlug: 'la-mercader' },
]

export function GameDemo() {
  const [state, send] = useMachine(gameMachine, {
    input: createInitialContext(DEMO_PLAYERS),
  })

  const ctx = state.context
  const currentPlayerId = ctx.turnOrder[ctx.currentPlayerIndex]
  const currentPlayer = ctx.players[currentPlayerId]

  function handleTileClick(tileId: TileId) {
    if (ctx.phase !== 'choosing_path') return
    const paths = ctx.availablePaths ?? []
    const validPath = paths.find(p => p[p.length - 1] === tileId)
    if (validPath) send({ type: 'CHOOSE_PATH', path: validPath })
  }

  return (
    <div className="relative w-full h-dvh">
      <BoardCanvas
        context={ctx}
        availablePaths={ctx.availablePaths}
        onTileClick={handleTileClick}
      />

      {/* HUD overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
        {ctx.turnOrder.map((pid, i) => {
          const p = ctx.players[pid]
          const isCurrent = pid === currentPlayerId
          return (
            <div
              key={pid}
              className={`px-3 py-2 rounded-lg text-sm font-mono backdrop-blur-sm border transition-all
                ${isCurrent ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-black/40 text-white/60'}
                ${p.isEliminated ? 'opacity-40 line-through' : ''}`}
            >
              <div className="font-bold">{p.characterSlug.split('-').slice(1).join(' ')}</div>
              <div>💰 {p.credits}</div>
              <div>⚡ {p.energy}</div>
              {p.isInStasis && <div className="text-yellow-400">ESTASIS</div>}
            </div>
          )
        })}
      </div>

      {/* Turn info + action buttons */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
        <div className="text-white/50 text-xs font-mono">
          Turno {ctx.currentTurn}/{ctx.maxTurns} • Fase: {ctx.phase}
        </div>

        {ctx.phase === 'rolling' && (
          <button
            onClick={() => send({ type: 'ROLL_DICE' })}
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full text-sm transition-colors shadow-[0_0_20px_rgba(0,229,255,0.4)]"
          >
            🎲 Tirar Dado
          </button>
        )}

        {ctx.phase === 'choosing_path' && (
          <div className="text-cyan-400 text-sm font-mono animate-pulse">
            Dado: {ctx.diceValue} • Selecciona destino en el tablero
          </div>
        )}

        {ctx.phase === 'buying' && (
          <div className="flex gap-3">
            <button
              onClick={() => send({ type: 'BUY_PROPERTY', tileId: currentPlayer.currentTileId })}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full text-sm"
            >
              Comprar
            </button>
            <button
              onClick={() => send({ type: 'SKIP_BUY' })}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm"
            >
              Pasar
            </button>
          </div>
        )}

        {ctx.phase === 'paying_rent' && (
          <div className="flex gap-3">
            <button
              onClick={() => send({ type: 'PAY_RENT_CREDITS' })}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full text-sm"
            >
              Pagar con 💰
            </button>
            <button
              onClick={() => send({ type: 'PAY_RENT_ENERGY' })}
              className="px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-full text-sm"
            >
              Pagar con ⚡
            </button>
          </div>
        )}

        {ctx.phase === 'stasis_choice' && (
          <div className="flex gap-3">
            <button
              onClick={() => send({ type: 'PAY_STASIS', method: 'credits' })}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full text-sm"
            >
              Liberarse 50💰
            </button>
            <button
              onClick={() => send({ type: 'PAY_STASIS', method: 'energy' })}
              className="px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-full text-sm"
            >
              Liberarse 5⚡
            </button>
            <button
              onClick={() => send({ type: 'SKIP_STASIS' })}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm"
            >
              Perder turno
            </button>
          </div>
        )}

        {ctx.phase === 'finished' && (
          <div className="text-2xl text-cyan-400 font-bold animate-pulse">
            ¡Partida terminada!
          </div>
        )}
      </div>
    </div>
  )
}
