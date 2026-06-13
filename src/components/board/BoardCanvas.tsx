'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import type { GameContext, TileId } from '@/engine/schemas'
import { HexTile } from './HexTile'
import { PlayerToken } from './PlayerToken'
import { NucleusCore } from './NucleusCore'
import { PostFX } from './PostFX'

interface BoardCanvasProps {
  context: GameContext
  availablePaths?: TileId[][]
  selectedTile?: TileId | null
  onTileClick?: (tileId: TileId) => void
}

export function BoardCanvas({
  context,
  availablePaths,
  selectedTile,
  onTileClick,
}: BoardCanvasProps) {
  const availableDestinations = new Set(
    availablePaths?.map(path => path[path.length - 1]) ?? []
  )

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#0a0a0f' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 10, 8]} fov={50} />
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={5}
          maxDistance={20}
        />

        {/* Lighting — neon ambient + directional */}
        <ambientLight intensity={0.15} color="#1a1a2e" />
        <pointLight position={[0, 8, 0]} color="#00e5ff" intensity={3} distance={20} />
        <pointLight position={[5, 4, 5]} color="#e040fb" intensity={1.5} distance={15} />
        <pointLight position={[-5, 4, -5]} color="#69f0ae" intensity={1.5} distance={15} />

        <Suspense fallback={null}>
          {/* Hex tiles */}
          {Object.entries(context.tiles).map(([id, tile]) => (
            <HexTile
              key={id}
              tile={tile}
              tileId={id as TileId}
              isSelected={selectedTile === id}
              isAvailable={availableDestinations.has(id as TileId)}
              onClick={onTileClick}
            />
          ))}

          {/* Nucleus overlay */}
          <NucleusCore
            currentTurn={context.currentTurn}
            maxTurns={context.maxTurns}
          />

          {/* Player tokens */}
          {context.turnOrder.map((playerId, i) => (
            <PlayerToken
              key={playerId}
              player={context.players[playerId]}
              playerIndex={i}
            />
          ))}

          {/* Post-processing FX */}
          <PostFX />
        </Suspense>
      </Canvas>
    </div>
  )
}
