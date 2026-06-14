'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { Tile } from '@/engine/schemas'
import { hexToWorld } from './HexTile'
import { coordsFromTileId } from '@/engine/board'
import type { TileId } from '@/engine/schemas'

interface SiegeOverlayProps {
  tiles: Record<TileId, Tile>
}

function SiegeRing({ tileId, tile }: { tileId: TileId; tile: Tile }) {
  const ringRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ringRef.current) return
    const t = clock.getElapsedTime()
    ringRef.current.rotation.z = t * 2
    ringRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.05)
  })

  const { q, r } = coordsFromTileId(tileId)
  const [wx, , wz] = hexToWorld(q, r)

  return (
    <mesh ref={ringRef} position={[wx, 0.35, wz]}>
      <torusGeometry args={[0.55, 0.04, 6, 20]} />
      <meshStandardMaterial
        color="#ff1744"
        emissive="#ff1744"
        emissiveIntensity={2}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

export function SiegeOverlay({ tiles }: SiegeOverlayProps) {
  const siegedTiles = Object.entries(tiles).filter(
    ([, t]) => t.isUnderSiege
  ) as [TileId, Tile][]

  if (siegedTiles.length === 0) return null

  return (
    <>
      {siegedTiles.map(([id, tile]) => (
        <SiegeRing key={id} tileId={id} tile={tile} />
      ))}
    </>
  )
}
