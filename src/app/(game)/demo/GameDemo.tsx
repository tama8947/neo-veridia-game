'use client'

import { useMachine } from '@xstate/react'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { PlayerHUD } from '@/components/board/PlayerHUD'
import { ActionPanel } from '@/components/board/ActionPanel'
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
      <PlayerHUD context={ctx} />
      <ActionPanel context={ctx} onSend={e => send(e as Parameters<typeof send>[0])} />
    </div>
  )
}
