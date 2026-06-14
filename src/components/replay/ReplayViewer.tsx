'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ReplayFrame } from '@/lib/replay'
import { diffFrames } from '@/lib/replay'

interface ReplayViewerProps {
  frames: ReplayFrame[]
}

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 rounded border border-white/20 text-white/70 hover:border-white/40 disabled:opacity-30 text-xs"
    >
      {children}
    </button>
  )
}

export function ReplayViewer({ frames }: ReplayViewerProps) {
  const [cursor, setCursor]   = useState(0)
  const [playing, setPlaying] = useState(false)

  const frame = frames[cursor]
  const prev  = cursor > 0 ? frames[cursor - 1] : null
  const diffs = prev ? diffFrames(prev, frame) : []

  const step = useCallback((dir: number) => {
    setCursor(c => Math.max(0, Math.min(frames.length - 1, c + dir)))
  }, [frames.length])

  useEffect(() => {
    if (!playing) return
    if (cursor >= frames.length - 1) {
      const id = setTimeout(() => setPlaying(false), 0)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => step(1), 900)
    return () => clearTimeout(id)
  }, [playing, cursor, frames.length, step])

  if (!frame) return <p className="text-white/50 text-sm">Sin frames de replay disponibles.</p>

  const playerIds = Object.keys(frame.players)

  return (
    <div className="flex flex-col gap-4 text-white text-sm">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={() => step(-10)} disabled={cursor === 0}>&lt;&lt;</Btn>
        <Btn onClick={() => step(-1)}  disabled={cursor === 0}>&lt;</Btn>
        <button
          onClick={() => { if (cursor >= frames.length - 1) setCursor(0); setPlaying(p => !p) }}
          className="px-4 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs min-w-20"
        >
          {playing ? 'Pausar' : cursor >= frames.length - 1 ? 'Reiniciar' : 'Play'}
        </button>
        <Btn onClick={() => step(1)}  disabled={cursor >= frames.length - 1}>&gt;</Btn>
        <Btn onClick={() => step(10)} disabled={cursor >= frames.length - 1}>&gt;&gt;</Btn>
        <span className="ml-2 text-white/40 text-xs">Frame {cursor + 1} / {frames.length}</span>
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={cursor}
        onChange={e => { setPlaying(false); setCursor(Number(e.target.value)) }}
        className="w-full accent-violet-500"
      />

      {/* Frame info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
          <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Turno / Fase</p>
          <p className="font-bold">
            {frame.turn} — <span className="text-violet-300">{frame.phase}</span>
          </p>
          {frame.diceValue !== undefined && (
            <p className="text-white/40 text-xs mt-1">Dado: {frame.diceValue}</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
          <p className="text-white/50 text-xs mb-2 uppercase tracking-wide">Cambios</p>
          {diffs.length === 0 ? (
            <p className="text-white/30 italic text-xs">Sin cambios</p>
          ) : (
            <ul className="space-y-0.5">
              {diffs.slice(0, 6).map((d, i) => (
                <li key={i} className="text-xs text-cyan-300 font-mono truncate">{d}</li>
              ))}
              {diffs.length > 6 && (
                <li className="text-xs text-white/30">+{diffs.length - 6} más…</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {playerIds.map(pid => {
          const p = frame.players[pid]
          return (
            <div
              key={pid}
              className={`rounded-lg border p-3 ${
                p.isEliminated
                  ? 'border-red-800/40 bg-red-950/20'
                  : p.isInStasis
                  ? 'border-amber-700/40 bg-amber-950/20'
                  : 'border-white/10 bg-slate-900/60'
              }`}
            >
              <p className="font-semibold text-white/90 mb-1 text-xs">
                {pid}
                {p.isEliminated && <span className="ml-2 text-red-400">eliminado</span>}
                {p.isInStasis   && <span className="ml-2 text-amber-400">en estasis</span>}
              </p>
              <div className="flex gap-4 text-xs text-white/60">
                <span>💰 {p.credits}</span>
                <span>⚡ {p.energy}</span>
                <span className="text-white/30 font-mono truncate">{p.currentTileId}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
