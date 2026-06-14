'use client'

import { usePartySocket } from '@/hooks/usePartySocket'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { PlayerHUD } from '@/components/board/PlayerHUD'
import { ActionPanel } from '@/components/board/ActionPanel'
import type { TileId } from '@/engine/schemas'

interface RoomClientProps {
  roomId: string
  userId: string
  userName: string
  characterSlug: string
}

export function RoomClient({ roomId, userId, characterSlug }: RoomClientProps) {
  const { context, status, error, playerCount, sendIntent, startGame } = usePartySocket({
    roomId,
    userId,
    characterSlug,
  })

  // ── Lobby (waiting for players) ───────────────────────────────────────────
  if (status === 'connecting' || status === 'joined') {
    return (
      <div className="min-h-dvh bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 font-mono">
        <div className="text-cyan-400 text-2xl font-bold">NEO-VERIDIA</div>
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center gap-4 min-w-[300px]">
          <div className="text-white/60 text-sm">Sala: <span className="text-white">{roomId}</span></div>
          <div className="text-white/60 text-sm">
            Jugadores: <span className="text-cyan-400">{playerCount}</span> / 3
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border ${
                  i < playerCount
                    ? 'border-cyan-400 bg-cyan-400/20'
                    : 'border-white/10 bg-white/5'
                }`}
              />
            ))}
          </div>

          {playerCount >= 2 && (
            <button
              onClick={startGame}
              className="mt-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full text-sm transition-colors"
            >
              ▶ Iniciar partida
            </button>
          )}

          {playerCount < 2 && (
            <div className="text-white/30 text-xs animate-pulse">
              Esperando al menos 2 jugadores…
            </div>
          )}

          <div className="text-white/20 text-xs mt-2">
            Comparte el enlace de esta página para invitar jugadores
          </div>
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}
      </div>
    )
  }

  // ── Game over ─────────────────────────────────────────────────────────────
  if (status === 'finished') {
    return (
      <div className="min-h-dvh bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 font-mono">
        <div className="text-3xl text-cyan-400 font-bold animate-pulse">¡Partida terminada!</div>
        {context && (
          <div className="flex flex-col gap-2 items-center">
            {Object.values(context.players)
              .sort((a, b) => b.credits - a.credits)
              .map((p, i) => (
                <div key={p.id} className={`text-sm ${i === 0 ? 'text-amber-400 font-bold' : 'text-white/60'}`}>
                  {i === 0 ? '🏆' : `${i + 1}.`} {p.characterSlug} — {p.credits}💰
                </div>
              ))}
          </div>
        )}
        <a href="/lobby" className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full text-sm transition-colors">
          Volver al lobby
        </a>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-dvh bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 font-mono">
        <div className="text-red-400 text-xl font-bold">Error de conexión</div>
        <div className="text-white/50 text-sm">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm"
        >
          Reconectar
        </button>
      </div>
    )
  }

  // ── In game ───────────────────────────────────────────────────────────────
  if (!context) return null

  function handleTileClick(tileId: TileId) {
    if (!context || context.phase !== 'choosing_path') return
    const paths = context.availablePaths ?? []
    const validPath = paths.find(p => p[p.length - 1] === tileId)
    if (validPath) sendIntent({ type: 'CHOOSE_PATH', path: validPath })
  }

  return (
    <div className="relative w-full h-dvh">
      <BoardCanvas
        context={context}
        availablePaths={context.availablePaths}
        onTileClick={handleTileClick}
      />
      <PlayerHUD context={context} />
      <ActionPanel
        context={context}
        onSend={e => sendIntent(e as Parameters<typeof sendIntent>[0])}
      />
    </div>
  )
}
