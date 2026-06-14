'use client'

import type { GameContext } from '@/engine/schemas'
import { checkCluster } from '@/engine/economy'

interface PlayerHUDProps {
  context: GameContext
}

const COLOR_DOT: Record<string, string> = {
  cyan: 'bg-cyan-400', sky: 'bg-sky-400', lime: 'bg-lime-400', emerald: 'bg-emerald-400',
  amber: 'bg-amber-400', orange: 'bg-orange-400', rose: 'bg-rose-400', fuchsia: 'bg-fuchsia-400',
  magenta: 'bg-pink-400', indigo: 'bg-indigo-400', violet: 'bg-violet-400', teal: 'bg-teal-400',
}

export function PlayerHUD({ context }: PlayerHUDProps) {
  const currentPlayerId = context.turnOrder[context.currentPlayerIndex]

  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between gap-2 pointer-events-none">
      {context.turnOrder.map((pid) => {
        const p = context.players[pid]
        const isCurrent = pid === currentPlayerId

        const ownedTiles = Object.values(context.tiles).filter(t => t.ownerId === pid)
        const ownedColors = [...new Set(ownedTiles.map(t => t.color).filter(Boolean))] as string[]
        const clusters = ownedColors.filter(color => checkCluster(context.tiles, pid, color))

        return (
          <div
            key={pid}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono backdrop-blur-sm border transition-all
              ${isCurrent
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                : 'border-white/10 bg-black/40 text-white/60'}
              ${p.isEliminated ? 'opacity-30 line-through' : ''}`}
          >
            <div className="font-bold text-sm mb-1 truncate">
              {p.characterSlug.split('-').slice(1).join(' ')}
              {isCurrent && <span className="ml-1 text-cyan-400">▶</span>}
            </div>

            <div className="flex gap-3">
              <span>💰 {p.credits}</span>
              <span>⚡ {p.energy}</span>
            </div>

            {ownedTiles.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {ownedColors.map(color => (
                  <span
                    key={color}
                    title={clusters.includes(color) ? `Clúster ${color}` : color}
                    className={`inline-block w-2 h-2 rounded-full ${COLOR_DOT[color] ?? 'bg-white/30'}
                      ${clusters.includes(color) ? 'ring-1 ring-white/60' : ''}`}
                  />
                ))}
              </div>
            )}

            {p.isInStasis && (
              <div className="mt-1 text-yellow-400 font-bold">
                ESTASIS {p.stasisTurnsLeft > 0 ? `(${p.stasisTurnsLeft}t)` : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
