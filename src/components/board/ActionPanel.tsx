'use client'

import type { GameContext, TileId } from '@/engine/schemas'
import { calculateRent, upgradeCost, mortgageValue, checkCluster } from '@/engine/economy'

interface ActionPanelProps {
  context: GameContext
  onSend: (event: Record<string, unknown>) => void
}

export function ActionPanel({ context, onSend }: ActionPanelProps) {
  const currentPlayerId = context.turnOrder[context.currentPlayerIndex]
  const currentPlayer = context.players[currentPlayerId]
  const { phase } = context

  const ownedTiles = Object.entries(context.tiles)
    .filter(([, t]) => t.ownerId === currentPlayerId && t.type === 'property')

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
      <div className="text-white/40 text-xs font-mono">
        Turno {context.currentTurn}/{context.maxTurns} · {phase}
        {context.globalEffects.some(e => e.key === 'RENT_INCREASE_25') && (
          <span className="ml-2 text-amber-400">🔥 Rentas +25%</span>
        )}
        {context.globalEffects.some(e => e.key === 'ENERGY_CRISIS') && (
          <span className="ml-2 text-red-400">⚠ Crisis energética</span>
        )}
      </div>

      {/* Primary phase actions */}
      {phase === 'rolling' && (
        <button
          onClick={() => onSend({ type: 'ROLL_DICE' })}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full text-sm transition-colors shadow-[0_0_20px_rgba(0,229,255,0.4)]"
        >
          🎲 Tirar Dado
        </button>
      )}

      {phase === 'choosing_path' && (
        <div className="text-cyan-400 text-sm font-mono animate-pulse">
          Dado: {context.diceValue} · Selecciona destino en el tablero
        </div>
      )}

      {phase === 'buying' && (
        <div className="flex gap-3">
          <button
            onClick={() => onSend({ type: 'BUY_PROPERTY', tileId: currentPlayer.currentTileId })}
            disabled={currentPlayer.credits < (context.tiles[currentPlayer.currentTileId]?.baseCost ?? Infinity)}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold rounded-full text-sm"
          >
            Comprar 💰 {context.tiles[currentPlayer.currentTileId]?.baseCost}
          </button>
          <button
            onClick={() => onSend({ type: 'SKIP_BUY' })}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm"
          >
            Pasar
          </button>
        </div>
      )}

      {phase === 'paying_rent' && (
        <RentPanel context={context} currentPlayerId={currentPlayerId} onSend={onSend} />
      )}

      {phase === 'stasis_choice' && (
        <div className="flex gap-3">
          <button
            onClick={() => onSend({ type: 'PAY_STASIS', method: 'credits' })}
            disabled={currentPlayer.credits < 50}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-full text-sm"
          >
            Liberarse 50💰
          </button>
          <button
            onClick={() => onSend({ type: 'PAY_STASIS', method: 'energy' })}
            disabled={currentPlayer.energy < 5}
            className="px-6 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-bold rounded-full text-sm"
          >
            Liberarse 5⚡
          </button>
          <button
            onClick={() => onSend({ type: 'SKIP_STASIS' })}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm"
          >
            Perder turno
          </button>
        </div>
      )}

      {phase === 'guild_event' && (
        <button
          onClick={() => onSend({ type: 'GUILD_RESCUE' })}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full text-sm"
        >
          🛡 Rescate Gremial (+100💰)
        </button>
      )}

      {phase === 'finished' && (
        <div className="text-2xl text-cyan-400 font-bold animate-pulse">
          ¡Partida terminada!
        </div>
      )}

      {/* Secondary actions: upgrade / mortgage (always available in non-movement phases) */}
      {['rolling', 'end_turn'].includes(phase) && ownedTiles.length > 0 && (
        <PropertyActionsMenu
          tiles={ownedTiles}
          context={context}
          playerId={currentPlayerId}
          onSend={onSend}
        />
      )}
    </div>
  )
}

function RentPanel({
  context, currentPlayerId, onSend,
}: { context: GameContext; currentPlayerId: string; onSend: (e: Record<string, unknown>) => void }) {
  const player = context.players[currentPlayerId]
  const rent = calculateRent(context, player.currentTileId)
  const energyCost = Math.ceil(rent / 20)
  const ownerSlug = context.tiles[player.currentTileId]?.ownerId
    ? context.players[context.tiles[player.currentTileId].ownerId!]?.characterSlug ?? '?'
    : '?'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-white/60 text-xs font-mono">
        Renta a <span className="text-white">{ownerSlug}</span>:{' '}
        <span className="text-amber-400">{rent}💰</span> · o{' '}
        <span className="text-violet-400">{energyCost}⚡</span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onSend({ type: 'PAY_RENT_CREDITS' })}
          disabled={player.credits < rent}
          className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-full text-sm"
        >
          Pagar {rent}💰
        </button>
        <button
          onClick={() => onSend({ type: 'PAY_RENT_ENERGY' })}
          disabled={player.energy < energyCost}
          className="px-6 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-bold rounded-full text-sm"
        >
          Pagar {energyCost}⚡
        </button>
      </div>
    </div>
  )
}

function PropertyActionsMenu({
  tiles, context, playerId, onSend,
}: {
  tiles: [string, (typeof context.tiles)[TileId]][]
  context: GameContext
  playerId: string
  onSend: (e: Record<string, unknown>) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
      {tiles.map(([id, tile]) => {
        const tileId = id as TileId
        const color = tile.color ?? 'unknown'
        const isMaxLevel = tile.upgradeLevel >= 3
        const isMortgaged = tile.isMortgaged
        const isUnderSiege = tile.isUnderSiege
        const cost = upgradeCost(tile.upgradeLevel)
        const player = context.players[playerId]
        const hasCluster = tile.color ? checkCluster(context.tiles, playerId, tile.color) : false

        return (
          <div
            key={id}
            className="flex items-center gap-1 px-2 py-1 bg-black/60 border border-white/10 rounded-lg text-xs font-mono"
          >
            <span className="text-white/60">{color}</span>
            <span className="text-white/40">L{tile.upgradeLevel}</span>
            {hasCluster && <span title="Clúster activo">✦</span>}
            {isMortgaged && <span className="text-red-400">H</span>}
            {isUnderSiege && <span className="text-red-500">⚔</span>}

            {!isMortgaged && !isUnderSiege && !isMaxLevel && (
              <button
                onClick={() => onSend({ type: 'UPGRADE_PROPERTY', tileId })}
                disabled={player.energy < cost}
                title={`Mejorar (${cost}⚡)`}
                className="ml-1 px-1.5 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/40 disabled:opacity-30 text-cyan-400 rounded text-xs"
              >
                ↑{cost}⚡
              </button>
            )}

            {!isMortgaged && (
              <button
                onClick={() => onSend({ type: 'MORTGAGE_PROPERTY', tileId })}
                title={`Hipotecar (+${mortgageValue(tile)}💰)`}
                className="ml-1 px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 rounded text-xs"
              >
                H+{mortgageValue(tile)}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
